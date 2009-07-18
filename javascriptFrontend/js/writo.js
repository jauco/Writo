/*!
 *  Copyright 2009 Jauco Noordzij
 * 
 *  This file is part of Writo.
 *
 *  Writo is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU Affero General Public License as published by
 *  the Free Software Foundation, either version 3 of the License, or
 *  (at your option) any later version.
 *
 *  Writo is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU Affero General Public License for more details.
 *
 *  You should have received a copy of the GNU Affero General Public License
 *  along with Writo.  If not, see <http://www.gnu.org/licenses/>.
 */


/*jslint white:true, 
         browser: true, 
         evil: false, 
         undef:true,
         nomen:true,
         eqeqeq: true, 
         plusplus:true,
         bitwise:true,
         regexp:true,
         onevar:true
*/

// = Writo Javascript frontend =
//

// ** {{{ String.has(searchChar) }}} **
// Use this function to test whether a string contains the {{{searchChar}}}
String.prototype.has = function (searchChar) {
    return this.indexOf(searchChar) > -1;
};

// ** {{{ String.isInt() }}} **
// Determine whether you can safely convert the String to an int.
String.prototype.isInt = function () {
    return parseInt(this, 10) + "" === this[0];
};

// == function nl_jauco_writo($) ==
// This function is defined on the window object, so you can call it from another script.
// it will return an object that exposes the API you can use to manipulate the document
// such as save() and load(). Once you call it, it will also register itself as a keypress monitor
// and it will construct a bare document skeleton on the div with id=DocumentContainer.
// 
// You should pass it a reference to the jQuery object

function nl_jauco_writo($) {

    // First some logging functions
    var IS_DEBUG = true;
    var doLog = function(){
        if (IS_DEBUG){
            if (window.console){
                console.log(arguments);
            }
        }
    }
    
    // == The init code ==
	
    // The following lines will set up the writohandler.
    var createWritoEditor;
    var writoEditor = createWritoEditor();
    $(document).bind("keypress.WritoHandler", writoEditor.keyHandler);
    writoEditor.setEditMode("command");
    writoEditor.load();
    return writoEditor;

    // ** The editor module **
    
	// This function creates an object called {{{writo}}} adds API functions to it, and returns it.
    
    function createWritoEditor() {
		
		// ** Global definitions **\\
		// We'll start of with the header declarations. \\ 
		// //All the declared variables are 'global' for within this function, declaring them here
		// reminds me of that fact and allows me to call them before they are defined.//
		
        
        var 
            // **{{{writo}}}** is the object that will be returned. //everything declared with **var** 
            // will be hidden once the writo object is returned. Only the functions declared as writo.X will be part
            // of the public API.//
            writo = {}, 
            //**{{{undoStack}}}** is an array with all commands that have been executed
            undoStack = [],
            //**{{{currentUndoPointer}}}** points to the current place in the undoStack
            currentUndoPointer = 0,
            //**{{{}}}**This is a representation of the current document that provides some functions for manipulating it.
            curDoc = {},
            //**{{{}}}**These functions are described at their implementation
            
            performCommand,
            basicCommandHandler,
            insertCommandHandler,
            DropUndoStackFromThisPointOnwards,
            executeCommand,
            moveCursor,
            getCommand;

		// == Command objects ==
		// Writo is created in a pluggable way, all commands that the user can execute are
		// written as seperate black box functions that are then passed around and persisted.

        // **{{{keyHandler}}}** receives an event object, extracts the key and
        // creates a command to execute. If that command has a handler function defined, it will not
        // immediately execute it, but instead continue to pass the following keypresses to that handler function. The result of
        // calling that function is another (or the same) handler function or {{{null}}}. Once {{{null}}} is returned created command is passed to the exectuteCommand function
        // which pushes it on the undo stack.
        //
        // The power of this system lies in the fact that a handler function has complete freedom to do 
        // whatever it wants. For example: The insert command keeps a private undoStack and silently creates insChar commands (resulting in characters appearing on the screen
        // before the insert command is finished. The rePerform command on the other hand proxies the command it is rePerforming by returning //that// command's handler.
        writo.keyHandler = function(){ //Closure, this is executed at the end.
            var functionKeyMapping,
                getKeyInfo,
                commandBeingConstructed,
                currentKeyHandler = [],
                previousCommand;
            // **{{{functionKeyMapping}}}** map id's to human friendly names (all at least two chars long to seperate them from ordinary keys)
            var functionKeyMapping = {
                8:   "backspace",
                20:  "capslock",
                46:  "del",
                40:  "down",
                35:  "end",
                27:  "esc",
                112: "f1",
                113: "f2", 
                114: "f3", 
                115: "f4", 
                116: "f5", 
                117: "f6", 
                118: "f7", 
                119: "f8", 
                120: "f9", 
                121: "f10", 
                122: "f11", 
                123: "f12",
                36:  "home", 
                45:  "insert", 
                37:  "left", 
                144: "numlock", 
                34:  "pagedown", 
                33:  "pageup", 
                19:  "pause", 
                38:  "up", 
                13:  "return", 
                39:  "right",
                145: "scroll", 
                32:  "space", 
                9:   "tab"
            };
            
            // **{{{getKeyInfo}}}**Takes an event and either returns a string with the char or keyName or throws an error if the key is unknown
            var getKeyInfo = function(evt){
                if (evt.keyCode === undefined || evt.keyCode === 0) {
                    return String.fromCharCode(evt.charCode);
                }
                else {
                    if (functionKeyMapping.hasOwnProperty(evt.keyCode)) {
                        return functionKeyMapping[evt.keyCode];
                    }
                    else {
                        throw ( new Error('UnknownKeyMapping'));
                    }
                }
            }
            // **{{{}}}**This is the actual keyHandler function.
            return function (evt) {
                var keyName,
                    command;
                try {
                    keyName = getKeyInfo(evt);
                    //check if we are starting the construction of a new command
                    if (commandBeingConstructed === undefined){
                        //if we are, and the key is a '.' simply execute the previous command again
                        if (keyName=='.' && previousCommand.doCommand !== undefined){
                            commandBeingConstructed = previousCommand;
                        }
                        else {
                            //If the key is no '.' retrieve a command object based on the key
                            commandBeingConstructed = getCommand(keyName);
                            //Test if it's a valid command
                            if (commandBeingConstructed.doCommand !== undefined){
                                currentKeyHandler = commandBeingConstructed.handler;
                            }
                            //Else it's a special command (undo or redo) They are treated a bit differently, since they shouldn't be on the undo stack
                            else {
                                commandBeingConstructed();
                                commandBeingConstructed = undefined;
                            }
                        }
                    } else {
                        //If we aren't then pass the key to the current handler and assign it's result to itself
                        currentKeyHandler = currentKeyHandler(keyName);
                    }
                    // Test if the command is ready to be execute
                    if (commandBeingConstructed !== undefined && currentKeyHandler === undefined){
                        previousCommand = commandBeingConstructed;
                        executeCommand(commandBeingConstructed);
                        commandBeingConstructed = undefined;
                        $("#commandStatus").html("");
                    }
                }
                catch (e){
                    //If something strange occurs: ignore it
                    if (currentKeyHandler == undefined){
                        commandBeingConstructed = undefined;
                    }
                    doLog(e);
                    return true;
                }
                return false;
            };
        }();
        
        //**{{{getCommand}}}** maps a key to a command object.
        getCommand = function (key) {
            if (key === 'u') {
                return writo.doUndo;
            }
            else if (key === 'r') {
                return writo.doRedo;
            }
            else if (key === "i") {
                return performCommand("insert");
            }
            else if (key === "h") {
                return performCommand("moveCursor", true);
            }
            else if (key === "b") {
                return performCommand("addClass", "heading");
            }
            else if (key === "l") {
                return performCommand("moveCursor", false);
            }
            else if (key === "backspace") {
                return performCommand("deleteChar");
            }
            else if (key.isInt()) {
                return performCommand("rePerform", key);
            }
        };

        var COMMANDS = {
            // ** {{{insChar }}}**
            // Appends {{{character}}} to the current element.
            insChar: function ([character]) {
                var command = {};
                command.insert = curDoc.insertCharBeforeCursor;
                command.backspace = curDoc.deleteCharBeforeCursor;
                command.character = character;
                command.doCommand = function () {
                    this.insert(this.character);
                    return this;
                };
                command.undoCommand = function () {
                    this.backspace();
                };
                return command;
            },
            // ** {{{addClass }}}**
            // Adds {{{className}}} to the current paragraph div.
            addClass: function ([className]) {
                var command = {};
                command.className = className;
                command.doCommand = function () {
                    $(".active").addClass(this.className);
                    return this;
                };
                command.undoCommand = function () {
                    $(".active").removeClass(this.className);
                };
                return command;
            },  
            // ** {{{ moveCursor }}} **
            // Returns a function that will move the cursor a specific step in a 
              // specific direction. Or just an empty dummy if the target location 
              // doesn't exist.
              // * {{{moveFunc: }}} a classname or other jQuery expression to determine how far the cursor moves
              // * {{{direction: }}} "prev" or "next"
            moveCursor : function ([goLeft]) {
                var command = {};
                command.caption = "move";
                command.direction = goLeft;
                command.skipOnUndostack = true;
                command.doCommand = function(){
                    var result = moveCursor(goLeft, false);
                    if (result === undefined){
                        this.doCommand = function(){return this};
                        this.undoCommand = function(){};
                    }
                    else {
                        command.undoCommand = function(){
                            moveCursor(!this.direction, false);
                        };
                    }
                    return this;
                };
                return command;
            },
            // ** {{{ deleteChar }}} **
            // Command that deletes the preceding element
            deleteChar : function ([]) {
                var command = {};
                command.caption = "delete "
                command.doCommand = function () {
                    var finalizedCommand = {};
                    finalizedCommand.insert = curDoc.insertCharBeforeCursor;
                    finalizedCommand.backspace = curDoc.deleteCharBeforeCursor;
                    finalizedCommand.deletedElement = finalizedCommand.backspace();
                    finalizedCommand.doCommand = function () {
                        this.backspace();
                    }
                    finalizedCommand.undoCommand = function () {
                        this.insert(this.deletedElement);
                    };
                    return finalizedCommand;
                };
                return command;
            },
            //**{{{rePerform}}}** rePerforms the following command {{{amount}}} times
            rePerform : function ([amount]) {
                var command = {};
                command.amount = amount;
                command.caption = amount+" times ";
                command.doCommand = function () {
                    finalizedCommand = {};
                    finalizedCommand.privateUndoStack = [];
                    finalizedCommand.command = command.command;
                    finalizedCommand.amount = command.amount;
                    for (var i = 0; i < command.amount; i += 1) {
                        executeCommand(command.command, finalizedCommand.privateUndoStack);
                    }
                    finalizedCommand.doCommand = function(){
                        for (var i = 0; i < this.amount; i += 1) {
                           this.privateUndoStack[i].doCommand();
                        }
                    }
                    finalizedCommand.undoCommand = function () {
                        for (var i = this.amount - 1; i >= 0; i -= 1) {
                            this.privateUndoStack[i].undoCommand();
                        }
                    };
                    return finalizedCommand;
                };
                command.handler = function(key){
                    if (key.isInt()){
                        command.amount = command.amount+""+key;
                        return command.handler;
                    }
                    else {
                        command.command = getCommand(key);
                        return command.command.handler;
                    }
                };
                return command;
            },
            //**{{{insert}}}** inserts all the keypresses until <esc> is pressed. 
            insert : function ([]) {
                var command = {};
                writo.setEditMode("insert");
                command.privateUndoStack = [];
                command.caption = "Insert ";
                command.handler = function(key){
                    //Abort when we receive an <esc>
                    if (key === 'esc') {
                        writo.setEditMode("command");
                        return undefined;
                    }
                    //otherwise start handling the keypresses
                    if (key.length === 1 || key === "return") {
                        executeCommand(performCommand("insChar", key), command.privateUndoStack);
                    }
                    else if (key === "backspace"){
                        executeCommand(performCommand("deleteChar"), command.privateUndoStack);
                    }
                    return command.handler;
                };
                //{{{doCommand}}} 
                // doesn't do anything (since all the keys have already been inserted by the handler)
                // but replaces itself with a doCommand that *does* reInsert all characters. This way the
                // first time you call doCommand nothing happens but all consecutive calls will reperform 
                // the command.
                command.doCommand = function () {
                    command.undoCommand = function () {
                        for (var i = this.privateUndoStack.length - 1; i >= 0; i -= 1) {
                            this.privateUndoStack[i].undoCommand();
                        }
                    };
                    command.doCommand = function () {
                        for (var i = 0; i < this.privateUndoStack.length; i += 1) {
                            this.privateUndoStack[i].doCommand();
                        }
                        return this;
                    };
                    delete command.handler;
                    return command;
                };
                return command;
            }
        };
            
        // **{{{performCommand }}}** The function performCommand creates command objects.
        // Each command has a {{{doCommand()}}}, {{{undoCommand()}}} and optional {{{handler()}}} function.
        // This function will return a command, and executeCommand will call their doCommand() function
        // and push the result on the undostack. This allows the command to prime itself on execution.
        // For example: the delete command is generic until it is executed, then it will store the 
        // character it has deleted so it can insert it again when it's undoCommand() is called.
        performCommand = function () { 
			// ** Returning the command objects **\\
            // This will be the actual performCommand function as far as the rest
            // of the code is concerned. Now that we've declared all possible commands, the following 
			// statements actually create and return one.
            return function (commandID) {
                var argArray = Array.slice(arguments,1); //convert the arguments 'array' to a real Array and drop commandID
                var cmd = COMMANDS[commandID](argArray);
                if ("caption" in cmd){
                    $("#commandStatus").append(cmd.caption);
                }
                return cmd; 
            };
        }();
        
        //**{{{executeCommand}}}**
        //This will call the {{{doCommand}}} on a command object and push the result
        //on the undo stack.
        executeCommand = function(command, localUndoStack){
            //A command is allowed to change itself upon being called and returning
            //a different object. The delete command uses this to implement its undo
            //function
            command = command.doCommand();
            DropUndoStackFromThisPointOnwards()
            if (localUndoStack === undefined){
                undoStack.push(command);
                currentUndoPointer = undoStack.length;
                writo.save();
            }
            else {
                localUndoStack.push(command);
            }
        };
        
		// ** {{{getEditMode }}} ** is able to tell us what the editmode is. It uses the "class" 
		// parameter of the body tag to determine this, so the mode that the code sees and the mode
		// that the user sees are always in sync.
        writo.getEditMode = function () {
            if ($("body").hasClass("insert")) {
                return "insert";
            }
            else {
                return "command";
            }
        };
		
		// **{{{setEditMode}}}** adds the body class and initializes the correct command handlers.
        writo.setEditMode = function (newMode) {
            var modes = ["insert", "command"];
            if (modes.indexOf(newMode)>-1){
                for (var i = 0; i < modes.length; i += 1) {
                    if ($("body").hasClass(modes[i])) {
                        $("body").removeClass(modes[i]);
                    }
                }
                $("body").addClass(newMode);
            }
        };
        
        // **{{{DropUndoStackFromThisPointOnwards}}}** well... this will Drop the Undo Stack From This PointOnwards. You can specify the point to drop from if you want.
        DropUndoStackFromThisPointOnwards = function(pointToDropFrom){
            if (pointToDropFrom === undefined){
                pointToDropFrom = currentUndoPointer;
            }
            if (pointToDropFrom !== undoStack.length) {
                undoStack.splice(pointToDropFrom, undoStack.length - pointToDropFrom);
            }
        }
        
        // == function nl_jauco_writo($) ==
        //From here on down is the public API
        
        //**{{{doUndo}}}** undo the last command
        writo.doUndo = function(){
            if (currentUndoPointer > 0) {
                var continueUndoing;
                do {
                    currentUndoPointer -= 1;
                    continueUndoing = undoStack[currentUndoPointer].skipOnUndostack;
                    undoStack[currentUndoPointer].undoCommand();
                } while (continueUndoing && currentUndoPointer > 0);
                writo.save();
            }
            else {
                doLog("There's nothing to undo");
            }
        }
        
        //**{{{doRedo}}}** redo the last command
        writo.doRedo = function(){
            if (currentUndoPointer < undoStack.length) {
                var continueRedoing;
                do {
                    continueRedoing = undoStack[currentUndoPointer].skipOnUndostack;
                    undoStack[currentUndoPointer].doCommand();
                    currentUndoPointer += 1;
                } while (continueRedoing && currentUndoPointer < undoStack.length);
                writo.save();
            }
            else {
                doLog("There's nothing to redo");
            }
        }
        
        //**{{{clean}}}** Throw away the DOM and the command history
        curDoc.clean = function(){
            DropUndoStackFromThisPointOnwards(0);
            $("#DocumentContainer")[0].innerHTML = "<div class='paragraph active'><span id='cursor'>|</span></div>";
        }
        
        //**{{{load}}}** load the document from localStorage
        writo.load = function(cmdArray){
            curDoc.clean();
            try {
                if ("document" in localStorage && "currentUndoPointer" in localStorage){
                    doLog("loading");
                    undoStack = eval("("+localStorage.document+")");
                    currentUndoPointer = parseInt(localStorage.currentUndoPointer);
                    if (undoStack.constructor === Array && currentUndoPointer > -1){
                        for(var i=0; i<currentUndoPointer; i++){
                            undoStack[i].doCommand();
                        }
                    }
                }
            }
            catch(e){
                doLog(e);
                curDoc.clean();
            }
        }
        
        //**{{{writeCommands}}}** dump the current undoStacl
        writo.writeCommands = function(){
            doLog(undoStack.toSource());
        }
        
        //**{{{save}}}** serialize all commands and save them to localStorage
        writo.save = function(){
            var undoStackAsString = undoStack.toSource();
            doLog("saving "+undoStackAsString.length+" bytes");
            localStorage.document = undoStackAsString;
            localStorage.currentUndoPointer = currentUndoPointer;
        }
        
        
        //**{{{reload}}}** save and load, mostly used to see if saving works properly
        writo.reload = function(){
            this.save();
            this.load();
        }

        
        //**{{{removeSaved}}}** Clean the document and remove the localStorage
        writo.removeSaved = function(){
            curDoc.clean();
            delete localStorage.document;
            delete localStorage.currentUndoPointer;
        }

        curDoc.getCursor = function(){
            return $('#cursor');
        }

        //get the node next to this one, might be a textnode, or a sentence marker, or null if there is no char
        var getNodeNextToCursor = function(beforeCursor, doRemove){
            var cursor = curDoc.getCursor();
            var sibling;
            if (beforeCursor){
                sibling = cursor[0].previousSibling;
                if (sibling == null){
                    return sibling;
                }
                if (sibling.nodeType == 3){ //textNode
                    var c = sibling.textContent.slice(-1);
                    if (doRemove){
                        sibling.textContent = sibling.textContent.slice(0,-1);
                        if (sibling.textContent.length === 0){
                            $(sibling).remove(); //cleanup empty textNodes
                        }
                    }
                    return $(document.createTextNode(c));
                }
                else if (sibling.nodeName == 'P'){ //sentenceMarker
                    if (doRemove){
                        cursor.prev().remove();
                    }
                    return $(sibling);
                }
            }
            else {
                sibling = cursor[0].nextSibling;
                if (sibling == null){
                    return sibling;
                }
                if (sibling.nodeType == 3){ //textNode
                    var c = sibling.textContent.slice(0,1);
                    if (doRemove){
                        sibling.textContent = sibling.textContent.slice(1);
                        if (sibling.textContent.length === 0){
                            $(sibling).remove(); //cleanup empty textNodes
                        }
                    }
                    return $(document.createTextNode(c));
                }
                else if (sibling.nodeName == 'P'){ //sentenceMarker
                    if (doRemove){
                        cursor.next().remove();
                    }
                    return $(sibling);
                }
            }
        };
        
        var insertNodeNextToCursor = function(c, beforeCursor){
            var cursor = curDoc.getCursor();
            if (beforeCursor){
                var nodeToAddCharTo = cursor[0].previousSibling;
                if (c[0].nodeType == 3 && nodeToAddCharTo !== null && nodeToAddCharTo.nodeType == 3){
                    nodeToAddCharTo.textContent += c[0].textContent;
                }
                else {
                    cursor.before(c);
                }
            }
            else {
                var nodeToAddCharTo = cursor[0].nextSibling;
                if (c[0].nodeType == 3 && nodeToAddCharTo !== null && nodeToAddCharTo.nodeType == 3){
                    nodeToAddCharTo.textContent = c[0].textContent+nodeToAddCharTo.textContent;
                }
                else {
                    cursor.after(c);
                }
            }
        };
        
        var insertParagraphMarker= function(beforeCursor){
            var cursor = curDoc.getCursor();
            var newPar = $("<div class='paragraph active'></div>");
            var curPar = cursor.parent();
            curPar.after(newPar);
            curPar.removeClass("active");
            followingNode = cursor[0].nextSibling;
            if (beforeCursor){
                newPar.append(cursor);
            }
            //Append all characters to the new paragraph
            while(followingNode){
                nodeToCopy = followingNode;
                followingNode = nodeToCopy.nextSibling;
                newPar.append(nodeToCopy);
            }
        }
        
        var removeParagraphMarker= function(beforeCursor){
            var cursor = curDoc.getCursor();
            var thisPar = cursor.parent();
            var followingPar = thisPar.next();
            if (followingPar.length > 0){
                thisPar.append(followingPar.contents());
            }
            followingPar.remove();
        }
        
        moveCursor = function(beforeCursor, deleteIt){
            var sibling = getNodeNextToCursor(beforeCursor, true);
            if (sibling == null){
                var cursor = curDoc.getCursor();
                var parToMoveTo;
                if (beforeCursor){
                    parToMoveTo = cursor.parent().prev('.paragraph');
                }
                else{
                    parToMoveTo = cursor.parent().next('.paragraph');
                }
                if (parToMoveTo.length > 0){
                    var curPar = cursor.parent();
                    parToMoveTo.addClass("active");
                    cursor.parent().removeClass("active");
                    if (beforeCursor){
                        parToMoveTo.append(cursor);
                    }
                    else {
                        parToMoveTo.prepend(cursor);
                    }
                }
                else {
                    return undefined;
                }
                if(deleteIt){
                    removeParagraphMarker(false);
                }
                return 'return';
            }
            else {
                if (!deleteIt){
                    insertNodeNextToCursor(sibling, !beforeCursor);
                }
            }
            return sibling[0].textContent;
        };
        
        curDoc.insertCharBeforeCursor = function(c){
            if (c == "return"){
                insertParagraphMarker(true);
            }
            else {
                if ('.!?'.has(c)){
                    c = $("<p>"+c+"</p>");
                }
                else {
                    c = $(document.createTextNode(c));
                }
                insertNodeNextToCursor(c, true);
            }
        }
        
        curDoc.deleteCharBeforeCursor = function(){
            return moveCursor(true, true);
        }
        
        curDoc.moveCursorLeft = function(){
            moveCursor(true, false);
        }
        
        curDoc.moveCursorRight = function(){
            moveCursor(false, false);
        }

        //publish document to the world (should eventually be a separate object that writo uses)
        writo.document = curDoc;
        //And finally return the writo object
        return writo;
    };
}
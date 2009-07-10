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
// This script contains the Writo javascript frontend.
// 
// == Some convenience functions ==
// 	Of course this app starts with my own personal convenience favourites.

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

// == Declarations ==
// The bookkeeping code you need to set everything up

// ** Set everything up **\\
// You can call this {{{init}}} function to get a {{{writo}}} application object.
function nl_jauco_writo($) {
    
    var IS_DEBUG = true;
    
    var doLog = function(){
        if (IS_DEBUG){
            if (window.console){
                console.log(arguments);
            }
        }
    }

    function clone(obj){
        if(obj == null || typeof(obj) != 'object')
            return obj;
        
        var temp = new obj.constructor();
        for (var key in obj)
            temp[key] = clone(obj[key]);
        return temp;
    }

    
    // ** The editor class/module **\\
	// The actually interesting stuff is defined in this function.
	//
	// //This var writoEditor = function(){[...]}() is a trick to create a scope 
    // (you define a function that you call immediately)//
    var writoEditor = function () {
		
		// ** Global definitions **
		// We'll start of with the header declarattions. \\ 
		// //All the declared variables are 'global' for within this function, declaring them here
		// reminds me of that fact.//
		
        // **{{{writo}}}** is the object that will be returned
        var writo = {}, 
            undoStack = [],
            currentUndoPointer = 0,
			// **These are the three functions** that {{{writo}}} provides.
            performCommand,
            basicCommandHandler,
            insertCommandHandler;

        var DropUndoStackFromThisPointOnwards = function(){
            if (currentUndoPointer !== undoStack.length) {
                undoStack.splice(currentUndoPointer, undoStack.length - currentUndoPointer);
            }
        }

		// == Command objects ==
		// Writo is created in a pluggable way, all commands that the user can execute are
		// written as seperate functions that are then passed around and will
		// eventually be persisted. This part of the code shows how the commands are created.
        //
        //  ** {{{performCommand }}} **
		// In the last part of the code you'll see that I link key presses to 
		// command objects. The function performCommand actually creates these
		// command objects. The first part will define all possible commands. 
		// If you want to know how they are used, you can scroll to the part
		// labeled "**Returning the command objects**"
		// Each function in COMMANDS will return an object with a doCommand and undoCommand function.
        performCommand = function () { 
            var COMMANDS = {
				// ** {{{insChar }}}**
                // Appends a character to the current element.
                // * {{{character:}}} is the character to append
                insChar: function ([character]) {
                    var command = {};
                    command.character = character;
                    command.doCommand = function () {
                        $("#cursor").before(
                            "<span class='char'>" + 
                            this.character + 
                            "</span>"
                        );
                        return this;
                    };
                    command.undoCommand = function () {
                        $("#cursor").prev(".char").remove();
                    };
                    return command;
                },
                // ** {{{setStyle }}}**
                // Adds a class to the current paragraph div.
                addClass: function ([className]) {
                    var command = {};
                    command.className = className;
                    command.name = "addclass: " + command.className;
                    command.doCommand = function () {
                        $(".active").addClass(this.className);
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
                moveCursor : function ([direction, moveFunc]) {
                    var command = {};
                    command.direction = direction;
                    command.moveFunc = moveFunc;
                    
                    command.moveCursor= function(newLocation, direction) {
                        if (! newLocation.closest("div.paragraph").hasClass("active")) {
                            $("#cursor").closest("div.paragraph").removeClass("active");
                            newLocation.closest("div.paragraph").addClass("active");
                        }
                        
                        if (direction === "next") {
                            newLocation.after($("#cursor"));
                        }
                        else {
                            newLocation.before($("#cursor"));
                        }
                    }

                    //if the newLocation exists
                    if ($("#cursor")[command.direction](command.moveFunc).length > 0) {
                        command.doCommand = function () {
                            this.moveCursor($("#cursor")[this.direction](this.moveFunc), this.direction);
                        };
                        command.undoCommand = function () {
                            var undoDirection;
                            if (this.direction=="prev"){
                                undoDirection = "next";
                            }
                            else {
                                undoDirection = "prev";
                            }
                            this.moveCursor($("#cursor")[undoDirection](this.moveFunc), undoDirection);
                        };
                    }
                    else {
                        command.doCommand = function () {};
                        command.undoCommand = function () {};
                    }
                    return command;
                },
				
				// ** {{{ DeleteChar }}} **
				// Command that deletes the preceding element
                deleteChar : function ([]) {
                    var command = {};
                    command.doCommand = function () {
                        var finalizedCommand = {};
                        finalizedCommand.deletedElement = $("#cursor").prev()[0].innerHTML;
                        $("#cursor").prev().remove();
                        finalizedCommand.doCommand = function () {
                            $("#cursor").prev().remove();
                        }
                        finalizedCommand.undoCommand = function () {
                            $("#cursor").before("<span class='char'>" + finalizedCommand.deletedElement + "</span>");
                        };
                        return finalizedCommand;
                    };
                    return command;
                },
                rePerform : function ([amount]) {
                    var command = {};
                    command.amount = amount;
                    command.doCommand = function () {
                        finalizedCommand = {};
                        finalizedCommand.privateUndoStack = [];
                        finalizedCommand.command = this.command;
                        finalizedCommand.amount = this.amount;
                        for (var i = 0; i < this.amount; i += 1) {
                            executeCommand(this.command, finalizedCommand.privateUndoStack);
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
                insert : function ([]) {
                    var command = {};
                    writo.setEditMode("insert");
                    command.privateUndoStack = [];
                    command.handler = function(key){
                        //Abort when we receive an <esc>
                        if (key === 'esc') {
                            writo.setEditMode("command");
                            return undefined;
                        }
                        //otherwise start handling the keypresses
                        //Only handle characters for now
                        if (key.length === 1) {
                            executeCommand(performCommand("insChar", key), command.privateUndoStack);
                        }
                        else if (key === "backspace"){
                            executeCommand(performCommand("deleteChar"), command.privateUndoStack);
                        }
                        return command.handler;
                    };
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
			
			// ** Returning the command objects **\\
            // Ok, this will be the actual performCommand function as far as the rest
            // of the code is concerned.
            //
			// Now that we've declared all possible commands, the following 
			// statement actually returns one.
            return function (commandID) {
                var argArray = Array.slice(arguments,1);//convert the arguments 'array' to a real Array and drop commandID
                return COMMANDS[commandID](argArray); 
            };
        }();

        var executeCommand = function(command, localUndoStack){
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
        
		// == User interaction ==
		// Now that we have commands we need to use them. The following code is all about setting 
		// modes, managing commands etc.

		// ** The {{{getCommand}}} ** is in use when we are in "command" mode. Every 
		// character key is bound to a command defined previously. The mapping is shown 
		// at the end of the function.
		//
		// You can do basic macro scripting by typing a number before the command. For example:
		// {{{j}}} will move the cursor up one line, {{{2j}}} will move the cursor up two lines.\\
		// The {{{insertCommandHandler}}} defined later is actually a kind of specific command. So it can
		// also be multiplied. Pressing {{{iw<esc>3}}} will result in {{{www}}} on the screen.
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
                return performCommand("moveCursor", "prev", ".char");
            }
            else if (key === "b") {
                return performCommand("addClass", "heading");
            }
            else if (key === "l") {
                return performCommand("moveCursor", "next", ".char");
            }
            else if (key === "backspace") {
                return performCommand("deleteChar");
            }
            else if (key.isInt()) {
                return performCommand("rePerform", key);
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

        // **{{{keyHandler}}}** is a utility function to get the keypress info from an event object. It translates between the numeric
		// code that the event object returns and a human readable string.
        writo.keyHandler = function(){ //Closure, this is executed at the end.
            var functionKeyMapping,
                getKeyInfo,
                commandBeingConstructed,
                currentKeyHandler = [],
                previousCommand;

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
            return function (evt) {
                var keyName,
                    command;
                
                try {
                    keyName = getKeyInfo(evt);
                    //check if we are starting the construction of a new command
                    if (commandBeingConstructed === undefined){
                        if (keyName=='.' && previousCommand.doCommand !== undefined){
                            commandBeingConstructed = previousCommand;
                        }
                        else {
                            //retrieve a command based on the key
                            commandBeingConstructed = getCommand(keyName);
                            //set globalhandler to the command's handler
                            if (commandBeingConstructed.doCommand !== undefined){
                                if (commandBeingConstructed !== undefined){
                                    currentKeyHandler = commandBeingConstructed.handler;
                                }
                            }
                            else {
                                commandBeingConstructed();
                                commandBeingConstructed = undefined;
                            }
                        }
                    } else {
                        //execute currentKeyhandler and assign it's result to itself
                        currentKeyHandler = currentKeyHandler(keyName);
                    }
                    if (commandBeingConstructed !== undefined && currentKeyHandler === undefined){
                        //execute "being constructed command"
                        previousCommand = commandBeingConstructed;
                        executeCommand(commandBeingConstructed);
                        commandBeingConstructed = undefined;
                    }
                }
                catch (e){
                    commandBeingConstructed = undefined;
                    currentKeyHandler = undefined;
                }
                return false;
            };
        }();
        
        writo.doUndo = function(){
            if (currentUndoPointer > 0) {
                currentUndoPointer -= 1;
                undoStack[currentUndoPointer].undoCommand();
            }
            else {
                doLog("There's nothing to undo");
            }
        }
        
        writo.doRedo = function(){
            if (currentUndoPointer < undoStack.length) {
                undoStack[currentUndoPointer].doCommand();
                currentUndoPointer += 1;
            }
            else {
                doLog("There's nothing to redo");
            }
        }
        
        writo.cleanDocument = function(){
            DropUndoStackFromThisPointOnwards();
            $("#DocumentContainer")[0].innerHTML = "<div class='active paragraph'><span id='cursor'>|</span></div>";
        }
        
        writo.giveName = function(){}
        
        writo.load = function(cmdArray){
            doLog("loading");
            this.cleanDocument();
            if ("document" in localStorage && "currentUndoPointer" in localStorage){
                undoStack = eval("("+localStorage.document+")");
                currentUndoPointer = localStorage.currentUndoPointer;
                if (undoStack.constructor === Array){
                    for(var i=0; i<currentUndoPointer; i++){
                        undoStack[i].doCommand();
                    }
                }
            }
        }
        
        writo.writeCommands = function(){
            $("#DocumentContainer")[0].innerHTML = undoStack.toSource();
        }
        
        writo.save = function(){
            doLog("saving");
            localStorage.document = undoStack.toSource();
            localStorage.currentUndoPointer = currentUndoPointer;
        }
        
        writo.reload = function(){
            this.save();
            this.load();
        }

        return writo;
    }();
	// == The init code ==
	// While perhaps not as convenient for the narrative. Scripting languages usually have their init code last.
	// The following lines will set up the writohandler.
    $(document).bind("keypress.WritoHandler", writoEditor.keyHandler);
    writoEditor.setEditMode("command");
    writoEditor.load();
    return writoEditor;
}
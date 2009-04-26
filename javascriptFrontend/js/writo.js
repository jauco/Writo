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
function init($) {

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
			// **The editor has two {{{modes}}}** depending on which the character keys are interpreted
            modes = ["insert", "command"],
            undoStack = [],
            currentUndoPointer = 0,
			// **These are the three functions** that {{{writo}}} provides.
            performCommand,
            basicCommandHandler,
            insertCommandHandler;

        writo.commandInProgress = false;
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
        //
		// //I'm defining the functions to accept an args array parameter instead of actually passing the values. This
		// allows me to construct the parameter sequence piece by piece and then pass it to the command. This saves me some
		// {{{if else }}} constructs at the cost of having less explicit functions//
        performCommand = function () { 
            var COMMANDS = {
				// ** {{{insChar }}}**
                // Appends a character to the current element.
                // * {{{commandID:}}} can be used to later identify the command.
                // * {{{character:}}} is the character to append
                insChar: function (args) {
                    var command = {};
                    command.character = args[1];
                    command.name = "insChar: "+command.character;
                    command.doCommand = function () {
                        $("#cursor").before(
                            "<span class='char'>" + 
                            this.character + 
                            "</span>"
                        );
                    };
                    command.undoCommand = function () {
                        $("#cursor").prev(".char").remove();
                    };
                    return command;
                },
                // ** {{{setStyle }}}**
                // Adds a class to the current paragraph div.
                addClass: function (args) {
                    var command = {};
                    command.className = args[1];
                    command.name = "addclass: "+command.className;
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
                  // * {{{commandID: }}} can be used to later identify the command.
                  // * {{{moveFunc: }}} a classname or other jQuery expression to determine how far the cursor moves
                  // * {{{direction: }}} "prev" or "next"
                moveCursor : function (args) {
                    var command = {};
                    command.direction = args[1];
                    command.moveFunc = args[2];
                    
                    function moveCursor(newLocation, direction) {
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
                            moveCursor($("#cursor")[this.direction](this.moveFunc), this.direction);
                        };
                        command.undoCommand = function () {
                            moveCursor($("#cursor")[this.direction](this.moveFunc), this.direction);
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
                deleteChar : function (args) {
                    var command ={};
                    command.deletedElement = $("#cursor").prev()[0].innerHTML;
                    command.doCommand = function () {
                        $("#cursor").prev().remove();
                    };
                    command.undoCommand = function () {
                        $("#cursor").before("<span class='char'>"+this.deletedElement+"</span>");
                    };
                    return command;
                }
            };
			
			// ** Returning the command objects **\\
            // Ok, this will be the actual performCommand function as far as the rest
            // of the code is concerned.
            //
			// Now that we've declared all possible commands, the following 
			// statement actually returns one. It also makes sure that the 
			// command is placed on the undo stack.
			
            return function (commandID) {
                var command;
                command = COMMANDS[commandID](arguments); 
                command.commandID = commandID;
                command.doCommand();
                console.warn(command.toSource());
                if (currentUndoPointer !== undoStack.length) {
                    undoStack.splice(currentUndoPointer, undoStack.length - currentUndoPointer);
                }
                undoStack.push(command);
                currentUndoPointer = undoStack.length;
                return command;
            };
        }();

		// == User interaction ==
		// Now that we have commands we need to use them. The following code is all about setting 
		// modes, managing commands etc.

		// ** The {{{basicCommandHandler}}} ** is in use when we are in "command" mode. Every 
		// character key is bound to a command defined previously. The mapping is shown 
		// at the end of the function.
		//
		// You can do basic macro scripting by typing a number before the command. For example:
		// {{{j}}} will move the cursor up one line, {{{2j}}} will move the cursor up two lines.\\
		// The {{{insertCommandHandler}}} defined later is actually a kind of specific command. So it can
		// also be multiplied. Pressing {{{3iw<esc>}}} will result in {{{www}}} on the screen.
		// 
		// //WOW! only four keystrokes to put www on the screen. This editor is super powerfull!//
		//
		// This macro-scripting-insert-mode stuff is implemented as a state-machine.
        basicCommandHandler = function () {
            var handlingInsert = false, //true when we return from insert mode
                executeCommand = false, //true when command building is done

                                  //A command consists of three parts:
                cmdCount    = 0,  //how many times it's executed
                cmdType    = "",  //The command ID
                cmdMov = "";      //The range where the command will be applied
            function clearVars(){
                handlingInsert = false;
                executeCommand = false;

                cmdCount    = 0;
                cmdType    = "";
                cmdMov = "";
                writo.commandInProgress = false;
            }
            return function (key, keyType) {
                writo.commandInProgress = true;
                //console.info("running basic command handler: ", key, keyType);
                //First, let's see if we are returning from an insert session
                if (handlingInsert) {
                    //console.info("Returning from insert");
                    handlingInsert = false;
                    executeCommand = true;
                }
                //If not, parse the command
                else {
                    //console.info("Not returning from insert");
                    //if the user is pressing numeric keys (the repeat count)
                    if (cmdType === "" && keyType === "char" && key.isInt()) {
                        cmdCount *= 10;
                        cmdCount += parseInt(key, 10);
                        //console.info("We pressed a number, cmdCount=", cmdCount);
                    }
                    //if this is the first non-numeric key (the command)
                    else if (cmdType === "") {
                        //console.info("We pressed a char");
                        if (cmdCount === 0) {
                            cmdCount = 1;
                        }
                        cmdType = key;
                        console.info("It's the '"+cmdType+"' key");
                        if (cmdType === 'i') {
                            handlingInsert = true;
                            writo.setEditMode("insert");
                        }
                        if ("urhlbx".has(cmdType)){
                            //these commands do not accept motions
                            executeCommand = true;
                        }
                    }
                    //This is the second key after the numeric ones (the motion)
                    else {
                        //console.info("doing the motion");
                        cmdMov = key;
                        executeCommand = true;
                    }
                }
                //If a complete command has been specified, then execute it.
                if (executeCommand === true) {
                    for (var i=0; i< cmdCount; i++){
                        console.log("complete command");
                        if (cmdType == 'u'){
                            writo.doUndo();
                        }
                        else if (cmdType == 'r'){
                            writo.doRedo();
                        }
                        else if (cmdType == "i"){
                            //ignore for now. Only useful when command multiplication is reenabled
                        }
                        else if (cmdType == "h"){
                            performCommand("moveCursor", "prev", ".char");
                        }
                        else if (cmdType == "b"){
                            performCommand("addClass", "heading");
                        }
                        else if (cmdType == "l"){
                            performCommand("moveCursor", "next", ".char");
                        }
                        else if (cmdType == "x"){
                            performCommand("deleteChar");
                        }
                        else {
                            
                        }
                        //console.groupEnd();
                    }
                    clearVars();
                }
            };
        }();

		// ** The {{{ insertCommandHandler }}} puts every char you type on screen.
        insertCommandHandler = function (key, keyType) {
            //Abort when we receive an <esc>
            if (key === 'esc') {
                //call the basicCommandHandler to signal that the 
                //input session is over.
                writo.setEditMode("command");
                basicCommandHandler(key, keyType);
            }
            //otherwise start handling the keypresses
            if (keyType === "char") {
                performCommand("insChar", key);
            }
        };

		// ** doUndo ** apparently I lied about the three functions. Here is another one.
        writo.doUndo = function () {
            if (currentUndoPointer > 0) {
                currentUndoPointer -= 1;
                undoStack[currentUndoPointer].undoCommand();
            }
            else {
                console.warn("There's nothing to undo")
            }
        };
        
		// ** It's hard to explain {{{ doRedo }}} without using the concepts "re" and "do"
        writo.doRedo = function () {
            if (currentUndoPointer < undoStack.length) {
                undoStack[currentUndoPointer].doCommand();
                currentUndoPointer += 1;
            }
            else {
                console.warn("There's nothing to redo")
            }
        };
        
		// ** {{{getEditMode }}} ** is able to tell us what the editmode is. It uses the "class" 
		// parameter of the body tag to determine this, so the mode that the code sees and the mode
		// that the user sees are always in sync.
        writo.getEditMode = function () {
            for (var i = 0; i < modes.length; i += 1) {
                if ($("body").hasClass(modes[i])) {
                    return modes[i];
                }
            }
        };
		
		// **{{{setEditMode}}}** adds the body class and initializes the correct command handlers.
        writo.setEditMode = function (newMode) {
            for (var i = 0; i < modes.length; i += 1) {
                if ($("body").hasClass(modes[i])) {
                    $("body").removeClass(modes[i]);
                }
            }
            $("body").addClass(newMode);
            if (newMode === "command") {
                console.info("Going to command mode");
                writo.commandHandler = basicCommandHandler;
            }
            else {
                console.info("Going to insert mode");
                writo.commandHandler = insertCommandHandler;
            }
        };

        // **{{{keyHandler}}}** is a utility function to get the keypress info from an event object. It translates between the numeric
		// code that the event object returns and a human readable string.
		//
		// //The code that javascript returns for a key differs between keypress handlers and keydown handlers. One only sets the keyCode,
		// the other only the charCode. Also, different browsers handle things lsightly differently.//
        writo.keyHandler = function (evt) {
            console.group("Handling: ", evt.keyCode, evt.charCode, evt);
            var keyType, 
                keyValue,
                functionKeyMapping = {
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
            if (evt.keyCode === undefined || evt.keyCode === 0) {
                keyType = "char";
                keyValue = String.fromCharCode(evt.charCode);
            }
            else {
                keyType = "functionKey";
                if (functionKeyMapping.hasOwnProperty(evt.keyCode)) {
                    keyValue = functionKeyMapping[evt.keyCode];
                }
                else {
                    keyValue = null;
                }
            }
            writo.commandHandler(keyValue, keyType, undoStack);
            console.groupEnd();
        };
        return writo;
    }();
	// == The init code ==
	// While perhaps not as convenient for the narrative. Scripting languages usually have their init code last.
	// The following lines will set up the writohandler.
    $(document).bind("keypress.WritoHandler", writoEditor.keyHandler);
    writoEditor.setEditMode("command");
    $("#DocumentContainer").append($("<div class='active paragraph'><span id='cursor'>|</span></div>"));
    return writoEditor;
}

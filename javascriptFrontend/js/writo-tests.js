// == The functional tests ==
// The following tests verify that manipulating a certain series of knobs will 
// # have the desired effect
// # will always have this effect even ten releases later.
var functionalTest = function(keys, writo){
    var doc = document.getElementsByTagName("body")[0];

    fireunit.compare(
        "|",
        $("#DocumentContainer").text(),
        "Test if document is empty, except for cursor"
    );

    fireunit.key(doc, "u");//insert mode
    fireunit.compare(
        false, 
        writo.commandInProgress,
        "Pressing undo when nothing is done yet, should gracefully fail, by doing nothing"
    );
    
    fireunit.key(doc, "r");//insert mode
    fireunit.compare(
        false, 
        writo.commandInProgress,
        "Pressing redo when nothing is done yet, should gracefully fail, by doing nothing"
    );
    
    fireunit.key(doc, "i");//insert mode
    fireunit.ok(
        $("body").hasClass("insert"), 
        "Pressing 'i' puts writo in insert mode"
    );
    fireunit.key(doc, keys.esc);//command mode
    fireunit.ok(
        $("body").hasClass("command"), 
        "Pressing 'esc' puts writo back in command mode"
    );
    
    fireunit.compare(
        "|",
        $("#DocumentContainer").text(),
        "Switching shouldn't change the document"
    );
    fireunit.key(doc, "i");//insert mode
    fireunit.key(doc, "t");
    fireunit.key(doc, "e");
    fireunit.key(doc, "s");
    fireunit.key(doc, "t");
    fireunit.key(doc, keys.esc);//command mode
    fireunit.compare(
        "test|",
        $("#DocumentContainer").text(),
        "Adding text works"
    );
    fireunit.key(doc, "u");//undo
    fireunit.key(doc, "u");//undo
    fireunit.key(doc, "u");//undo
    fireunit.compare(
        "t|",
        $("#DocumentContainer").text(),
        "Undoing multiple times works"
    );
    fireunit.key(doc, "r");//redo
    fireunit.key(doc, "r");//redo
    fireunit.compare(
        "tes|",
        $("#DocumentContainer").text(),
        "Redoing multiple times works"
    );
    
    fireunit.key(doc, "u");//undo
    fireunit.key(doc, "i");//insert mode
    fireunit.key(doc, "r");
    fireunit.key(doc, "u");
    fireunit.key(doc, "g");
    fireunit.key(doc, "k");
    fireunit.key(doc, keys.esc);
    fireunit.key(doc, "u");//undo
    
    fireunit.compare(
        "terug|",
        $("#DocumentContainer").text(),
        "Undoing, then adding new commands, then undoing again"
    );
    
    
    /*
    //test("test the cursor keys", function() {
    //make sure we're in command mode
    kp = new $.Event("keypress");
    kp.keyCode = 27;
    $(document).trigger(kp)
    fireunit.ok($("body").hasClass("command"), "Has the body tag the class 'command'?" );
    //Go to the left
    kp = new $.Event("keypress");
    kp.charCode = 104;
    $(document).trigger(kp)
    fireunit.compare($("#DocumentContainer").text(),"a|i","Move to the left");
    //Go to the right
    kp = new $.Event("keypress");
    kp.charCode = 108;
    $(document).trigger(kp)
    fireunit.compare($("#DocumentContainer").text(),"ai|","Move to the right");
    */
    fireunit.testDone();
}
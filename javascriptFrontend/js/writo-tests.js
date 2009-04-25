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
    
    fireunit.key(doc, "h");
    fireunit.key(doc, "h");
    fireunit.compare(
        "ter|ug",
        $("#DocumentContainer").text(),
        "Pressing the left cursor twice"
    );
    
    fireunit.key(doc, "l");
    fireunit.compare(
        "teru|g",
        $("#DocumentContainer").text(),
        "Pressing the right cursor once"
    );
    
    fireunit.testDone();
}
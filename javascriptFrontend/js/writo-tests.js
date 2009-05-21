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

    //"Pressing undo when nothing is done yet, should gracefully fail, by doing nothing"
    fireunit.key(doc, "u");
    //"Pressing redo when nothing is done yet, should gracefully fail, by doing nothing"
    fireunit.key(doc, "r");//insert mode
    
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
    fireunit.key(doc, "1");
    fireunit.compare(
        "ter|ug",
        $("#DocumentContainer").text(),
        "Doing a combo command, resulting in two left presses"
    );
    
    fireunit.key(doc, "l");
    fireunit.compare(
        "teru|g",
        $("#DocumentContainer").text(),
        "Pressing the right cursor once"
    );

    fireunit.key(doc, "l");
    fireunit.key(doc, "l");
    fireunit.key(doc, "i");//insert mode
    fireunit.key(doc, " ");
    fireunit.key(doc, keys.esc);
    fireunit.compare(
        "terug |",
        $("#DocumentContainer").text(),
        "Walking past the end of the text fails gracefully"
    );
    fireunit.key(doc, "x");
    fireunit.compare(
        "terug|",
        $("#DocumentContainer").text(),
        "Characters can be deleted"
    );

    fireunit.key(doc, "u");
    fireunit.compare(
        "terug |",
        $("#DocumentContainer").text(),
        "Delete can be undone"
    );

    
    fireunit.key(doc, "b");
    fireunit.ok(
        $("#DocumentContainer > div").hasClass("heading"), 
        "Pressing 'b' will apply the style 'heading' to the current paragraph"
    );

    fireunit.key(doc, "u");
    fireunit.ok(
        !$("#DocumentContainer > div").hasClass("heading"), 
        "Setting heading can be undone"
    );

    fireunit.key(doc, "x");
    fireunit.key(doc, "1");
    fireunit.compare(
        "teru|",
        $("#DocumentContainer").text(),
        "Reperform the last command by pressing the 1"
    );
    
    fireunit.key(doc, "x");
    fireunit.key(doc, "2");
    fireunit.key(doc, "u");
    fireunit.compare(
        "ter|",
        $("#DocumentContainer").text(),
        "Multiplied commands appear as one command on the undo stack"
    );

    
    fireunit.key(doc, "h");
    fireunit.key(doc, "i");
    fireunit.key(doc, "x");
    fireunit.key(doc, keys.esc);
    fireunit.key(doc, "l");
    fireunit.key(doc, "u");
    fireunit.key(doc, "u");
    fireunit.key(doc, "u");
    
    fireunit.compare(
        "ter|",
        $("#DocumentContainer").text(),
        "Test if undo works when navigating"
    );

    writo.giveName("foo");
    writo.cleanDocument();
    fireunit.compare(
        "|",
        $("#DocumentContainer").text(),
        "CleanDocument should clean the content"
    );
    
    writo.reload();
    fireunit.compare(
        "ter|",
        $("#DocumentContainer").text(),
        "Loading the document from string should result in the same document"
    );
    
    fireunit.testDone();
}
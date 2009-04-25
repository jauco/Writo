// == The functional tests ==
// The following tests verify that manipulating a certain series of knobs will 
// # have the desired effect
// # will always have this effect even ten releases later.
var functionalTest = new function(){
		var doc = document.getElementsByTagName("body")[0];

		fireunit.compare(
			"|",
			$("#DocumentContainer").text(),
			"Test if document is empty, except for cursor"
		);

		fireunit.key(doc, "i");
		fireunit.ok(
			$("body").hasClass("insert"), 
			"Pressing 'i' puts writo in insert mode"
		);
		fireunit.key(doc, keys.esc);
		fireunit.ok(
			$("body").hasClass("command"), 
			"Pressing 'esc' puts writo back in command mode"
		);
		
		fireunit.compare(
			"|",
			$("#DocumentContainer").text(),
			"Switching shouldn't change the document"
		);
		fireunit.key(doc, "i");
		fireunit.key(doc, "t");
		fireunit.key(doc, "e");
		fireunit.key(doc, "s");
		fireunit.key(doc, "t");
		fireunit.key(doc, keys.esc);
		fireunit.compare(
			"test|",
			$("#DocumentContainer").text(),
			"Adding text works"
		);
		writo.doUndo();
		writo.doUndo();
		writo.doUndo();
		fireunit.compare(
			"t|",
			$("#DocumentContainer").text(),
			"Undoing multiple times works"
		);
		writo.doRedo();
		writo.doRedo();
		writo.doRedo();
		fireunit.compare(
			"test|",
			$("#DocumentContainer").text(),
			"Redoing multiple times works"
		);
		
		writo.doUndo();
		writo.doUndo();
		fireunit.key(doc, "i");
		fireunit.key(doc, "r");
		fireunit.key(doc, "u");
		fireunit.key(doc, "g");
		fireunit.key(doc, "k");
		writo.doUndo();
		
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
	});
}

var terminal_text_ident = '&gt; ';
var terminal_text_title = '' +
	'UNDERRUN\n' +
	'__ \n' +
	'CONCEPT, GRAPHICS &AMP; PROGRAMMING:\n' +
	'DOMINIC SZABLEWSKI // PHOBOSLAB.ORG\n' +
	'__ \n' +
	'MUSIC:\n' +
	'ANDREAS LÖSCH // NO-FATE.NET\n' +
	'___ \n' +
	'SYSTEM VERSION: 13.20.18\n' +
	'CPU: PL(R) Q-COATL 7240 @ 12.6 THZ\n' +
	'MEMORY: 108086391056891900 BYTES\n' +
	' \n' +
	'CONNECTING...';

var terminal_text_garbage = 
	'´A1e{∏éI9·NQ≥ÀΩ¸94CîyîR›kÈ¡˙ßT-;ûÅf^˛,¬›A∫Sã€«ÕÕ' +
	'1f@çX8ÎRjßf•ò√ã0êÃcÄ]Î≤moDÇ’ñ‰\\ˇ≠n=(s7É;';

var terminal_text_story = 
	'DATE: SEP. 13, 2718 - 13:32\n' +
	'CRITICAL SOFTWARE FAILURE DETECTED\n' +
	'ANALYZING...\n' +
	'____\n \n' +
	'ERROR CODE: JS13K2018\n' +
	'STATUS: SYSTEMS OFFLINE\n' +
	'DESCRIPTION: BUFFER UNDERRUN DUE TO SATCOM R.U.D.\n' +
	'AFFECTED SYSTEM: FACILITY AUTOMATION\n' +
	'AFFECTED SUBSYSTEMS: AI, RADIATION SHIELDS, POWER MANAGEMENT\n' +
	' \n' +
	'INITIATING RESCUE SYSTEM...\n' +
	'___' +
	'FAILED\n \n' +
	'ATEMPTING AUTOMATED REBOOT...\n' +
	'___' +
	'FAILED\n' +
	'_ \n \n' +
	'MANUAL REBOOT OF ALL SYSTEMS REQUIRED\n' +
	'_ \n' +
	'USE WASD OR CURSOR KEYS TO MOVE, MOUSE TO SHOOT\n' +
	'CLICK TO INITIATE YOUR DEPLOYMENT\n ';

var terminal_text_outro = 
	'ALL SATELLITE LINKS ONLINE\n' +
	'CONNECTING...___' +
	'CONNECTION ESTABLISHED\n' +
	'RECEIVING TRANSMISSION...___ \n' +
	
	'SENT: SEP. 13, 2018\n' +
	'RCVD: SEP. 13, 2718\n \n' +
	
	'THANKS FOR PLAYING ❤_ \n' +
	'I HAVE PREVIOUSLY BEEN A PROUD SPONSOR OF THE JS13K\n' +
	'COMPETITION SINCE THE VERY FIRST ONE BACK IN 2012.\n' +
	'HOWEVER, THIS YEAR\'S COMPETITION WAS MY FIRST ONE\n' +
	'AS A PARTICIPANT AND IT HAS BEEN TREMENDOUS FUN!\n \n' +
	
	'I WANT TO THANK MY DEAR FRIEND ANDREAS LÖSCH OF\n' +
	'NO-FATE.NET FOR COMPOSING SOME AWESOME MUSIC ON\n' + 
	'SUCH SHORT NOTICE.\n \n' +

	'FURTHER THANKS GO OUT TO THE JS13K STAFF, THE\n' +
	'SONANT-X DEVELOPERS AND ALL OTHER PARTICIPANTS\n' +
	'IN THIS YEAR\'S JS13K. SEE YOU NEXT YEAR!\n \n' +
	'DOMINIC__' +
	'END OF TRANSMISSION';

var terminal_text_buffer = [],
	terminal_state = 0,
	terminal_current_line,
	terminal_line_wait = 100,
	terminal_print_ident = true,
	terminal_timeout_id = 0,
	terminal_hide_timeout = 0;

terminal_text_garbage += terminal_text_garbage + terminal_text_garbage;

function terminal_show() {
	clearTimeout(terminal_hide_timeout);
	a.style.opacity = 1;
	a.style.display = 'block';
}

function terminal_hide() {
	a.style.opacity = 0;
	terminal_hide_timeout = setTimeout(function(){a.style.display = 'none'}, 1000);
}

function terminal_cancel() {
	clearTimeout(terminal_timeout_id);
}

function terminal_prepare_text(text) {
	return text.replace(/_/g, '\n'.repeat(10)).split('\n');
}

function terminal_write_text(lines, callback) {
	if (lines.length) {
		terminal_write_line(lines.shift(), terminal_write_text.bind(this, lines, callback));
	}
	else {
		callback && callback();
	}
}

function terminal_write_line(line, callback) {
	if (terminal_text_buffer.length > 20) {
		terminal_text_buffer.shift();
	}
	if (line) {
		audio_play(audio_sfx_terminal);
		terminal_text_buffer.push((terminal_print_ident ? terminal_text_ident : '') + line);
		a.innerHTML = '<div>'+terminal_text_buffer.join('&nbsp;</div><div>')+'<b>█</b></div>';
	}
	terminal_timeout_id = setTimeout(callback, terminal_line_wait);
}

function terminal_show_notice(notice, callback) {
	a.innerHTML = '';
	terminal_text_buffer = [];

	terminal_cancel();
	terminal_show();
	terminal_write_text(terminal_prepare_text(notice), function(){
		terminal_timeout_id = setTimeout(function(){
			terminal_hide();
			callback && callback();
		}, 2000);
	});
}

function terminal_run_intro(callback) {
	terminal_text_buffer = [];
	terminal_write_text(terminal_prepare_text(terminal_text_title), function(){
		terminal_timeout_id = setTimeout(function(){
			terminal_run_garbage(callback);
		}, 4000);
	});
}

function terminal_run_garbage(callback) {
	terminal_print_ident = false;
	terminal_line_wait = 16;

	var t = terminal_text_garbage,
		length = terminal_text_garbage.length;

	for (var i = 0; i < 64; i++) {
		var s = (_math.random()*length)|0;
		var e = (_math.random()*(length - s))|0;
		t += terminal_text_garbage.substr(s, e) + '\n';
	}
	t += ' \n \n';
	terminal_write_text(terminal_prepare_text(t), function(){
		terminal_timeout_id = setTimeout(function(){
			terminal_run_story(callback);
		}, 1500);
	});
}

function terminal_run_story(callback) {
	terminal_print_ident = true;
	terminal_line_wait = 100;
	terminal_write_text(terminal_prepare_text(terminal_text_story), callback);
}

function terminal_run_outro(callback) {
	c.style.opacity = 0.3;
	a.innerHTML = '';
	terminal_text_buffer = [];

	terminal_cancel();
	terminal_show();
	terminal_write_text(terminal_prepare_text(terminal_text_outro));
}

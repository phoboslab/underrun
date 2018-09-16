import { audio_play, audio_sfx_terminal } from './audio';
import { _math } from './game';

var terminal_text_ident = '&gt; ';
var terminal_text_title = `\
UNDERRUN
__
CONCEPT, GRAPHICS &AMP; PROGRAMMING:
DOMINIC SZABLEWSKI // PHOBOSLAB.ORG
__
MUSIC:
ANDREAS LÖSCH // NO-FATE.NET
___
SYSTEM VERSION: 13.20.18
CPU: PL(R) Q-COATL 7240 @ 12.6 THZ
MEMORY: 108086391056891900 BYTES

CONNECTING...`;

var terminal_text_garbage = `\
´A1e{∏éI9·NQ≥ÀΩ¸94CîyîR›kÈ¡˙ßT-;ûÅf^˛,¬›A∫Sã€«ÕÕ
1f@çX8ÎRjßf•ò√ã0êÃcÄ]Î≤moDÇ’ñ‰\\ˇ≠n=(s7É;`;

var terminal_text_story = `\
DATE: SEP. 13, 2718 - 13:32
CRITICAL SOFTWARE FAILURE DETECTED
ANALYZING...
____

ERROR CODE: JS13K2018
STATUS: SYSTEMS OFFLINE
DESCRIPTION: BUFFER UNDERRUN DUE TO SATCOM R.U.D.
AFFECTED SYSTEM: FACILITY AUTOMATION
AFFECTED SUBSYSTEMS: AI, RADIATION SHIELDS, POWER MANAGEMENT

INITIATING RESCUE SYSTEM...
_
FAILED

ATEMPTING AUTOMATED REBOOT...
_
FAILED
_

MANUAL REBOOT OF ALL SYSTEMS REQUIRED
_
USE WASD OR CURSOR KEYS TO MOVE, MOUSE TO SHOOT
CLICK TO INITIATE YOUR DEPLOYMENT
`;

var terminal_text_outro = `\
ALL SATELLITE LINKS ONLINE
CONNECTING...___
CONNECTION ESTABLISHED
RECEIVING TRANSMISSION...___

SENT: SEP. 13, 2018
RCVD: SEP. 13, 2718


THANKS FOR PLAYING ❤_
I HAVE PREVIOUSLY BEEN A PROUD SPONSOR OF THE JS13K
COMPETITION SINCE THE VERY FIRST ONE BACK IN 2012.
HOWEVER, THIS YEAR'S COMPETITION WAS MY FIRST ONE
AS A PARTICIPANT AND IT HAS BEEN TREMENDOUS FUN!


I WANT TO THANK MY DEAR FRIEND ANDREAS LÖSCH OF
NO-FATE.NET FOR COMPOSING SOME AWESOME MUSIC ON
SUCH SHORT NOTICE.


FURTHER THANKS GO OUT TO THE JS13K STAFF, THE
SONANT-X DEVELOPERS AND ALL OTHER PARTICIPANTS
IN THIS YEAR'S JS13K. SEE YOU NEXT YEAR!

DOMINIC__
END OF TRANSMISSION`;

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

export function terminal_hide() {
  a.style.opacity = 0;
  terminal_hide_timeout = setTimeout(function() {
    a.style.display = 'none';
  }, 1000);
}

export function terminal_cancel() {
  clearTimeout(terminal_timeout_id);
}

function terminal_prepare_text(text) {
  return text.replace(/_/g, '\n'.repeat(10)).split('\n');
}

function terminal_write_text(lines, callback) {
  if (lines.length) {
    terminal_write_line(
      lines.shift(),
      terminal_write_text.bind(this, lines, callback),
    );
  } else {
    callback && callback();
  }
}

export function terminal_write_line(line, callback) {
  if (terminal_text_buffer.length > 20) {
    terminal_text_buffer.shift();
  }
  if (line) {
    audio_play(audio_sfx_terminal);
    terminal_text_buffer.push(
      (terminal_print_ident ? terminal_text_ident : '') + line,
    );
    a.innerHTML =
      '<div>' +
      terminal_text_buffer.join('&nbsp;</div><div>') +
      '<b>█</b></div>';
  }
  terminal_timeout_id = setTimeout(callback, terminal_line_wait);
}

function terminal_show_notice(notice, callback) {
  a.innerHTML = '';
  terminal_text_buffer = [];

  terminal_cancel();
  terminal_show();
  terminal_write_text(terminal_prepare_text(notice), function() {
    terminal_timeout_id = setTimeout(function() {
      terminal_hide();
      callback && callback();
    }, 2000);
  });
}

export function terminal_run_intro(callback) {
  terminal_text_buffer = [];
  terminal_write_text(terminal_prepare_text(terminal_text_title), function() {
    terminal_timeout_id = setTimeout(function() {
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
    var s = (_math.random() * length) | 0;
    var e = (_math.random() * (length - s)) | 0;
    t += terminal_text_garbage.substr(s, e) + '\n';
  }
  t += ' \n \n';
  terminal_write_text(terminal_prepare_text(t), function() {
    terminal_timeout_id = setTimeout(function() {
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

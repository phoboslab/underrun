import { audio_init } from './audio';
import { _document, load_image, next_level, game_tick } from './game';
import {
  terminal_write_line,
  terminal_cancel,
  terminal_hide,
  terminal_run_intro,
} from './terminal';
import { renderer_init, renderer_bind_image } from './renderer';

terminal_write_line('INITIATING...');

audio_init(function() {
  _document.onclick = function() {
    _document.onclick = null;
    terminal_cancel();
    terminal_write_line('INITIATING...', function() {
      renderer_init();

      load_image('q2', function() {
        terminal_hide();
        renderer_bind_image(this);
        next_level(game_tick);
      });
    });
  };

  terminal_run_intro();
});

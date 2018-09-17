import {
  sonantxr_generate_song,
  sonantxr_generate_sound,
} from './sonantx-reduced';

import { music_dark_meat_beat } from './music-dark-meat-beat';
import {
  sound_terminal,
  sound_shoot,
  sound_hit,
  sound_beep,
  sound_hurt,
  sound_pickup,
  sound_explode,
} from './sound-effects';

var audio_ctx = new (window.webkitAudioContext || window.AudioContext)();

export var audio_sfx_shoot;
export var audio_sfx_hit;
export var audio_sfx_hurt;
export var audio_sfx_beep;
export var audio_sfx_pickup;
export var audio_sfx_terminal;
export var audio_sfx_explode;

export function audio_init(callback) {
  sonantxr_generate_song(audio_ctx, music_dark_meat_beat, function(buffer) {
    audio_play(buffer, true);
    callback();
  });
  sonantxr_generate_sound(audio_ctx, sound_shoot, 140, function(buffer) {
    audio_sfx_shoot = buffer;
  });
  sonantxr_generate_sound(audio_ctx, sound_hit, 134, function(buffer) {
    audio_sfx_hit = buffer;
  });
  sonantxr_generate_sound(audio_ctx, sound_beep, 173, function(buffer) {
    audio_sfx_beep = buffer;
  });
  sonantxr_generate_sound(audio_ctx, sound_hurt, 144, function(buffer) {
    audio_sfx_hurt = buffer;
  });
  sonantxr_generate_sound(audio_ctx, sound_pickup, 156, function(buffer) {
    audio_sfx_pickup = buffer;
  });
  sonantxr_generate_sound(audio_ctx, sound_terminal, 156, function(buffer) {
    audio_sfx_terminal = buffer;
  });
  sonantxr_generate_sound(audio_ctx, sound_explode, 114, function(buffer) {
    audio_sfx_explode = buffer;
  });
}

export function audio_play(buffer, loop) {
  var source = audio_ctx.createBufferSource();
  source.buffer = buffer;
  source.loop = loop;
  source.connect(audio_ctx.destination);
  source.start();
}

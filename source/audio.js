var audio_ctx = new (window.webkitAudioContext||window.AudioContext)(),
	audio_sfx_shoot,
	audio_sfx_hit,
	audio_sfx_hurt,
	audio_sfx_beep,
	audio_sfx_pickup,
	audio_sfx_terminal;

function audio_init(callback) {
	sonantxr_generate_song(audio_ctx, music_dark_meat_beat, function(buffer){
		audio_play(buffer, true);
		callback();
	});
	sonantxr_generate_sound(audio_ctx, sound_shoot, 140, function(buffer){
		audio_sfx_shoot = buffer;
	});
	sonantxr_generate_sound(audio_ctx, sound_hit, 134, function(buffer){
		audio_sfx_hit = buffer;
	});
	sonantxr_generate_sound(audio_ctx, sound_beep, 173, function(buffer){
		audio_sfx_beep = buffer;
	});
	sonantxr_generate_sound(audio_ctx, sound_hurt, 144, function(buffer){
		audio_sfx_hurt = buffer;
	});
	sonantxr_generate_sound(audio_ctx, sound_pickup, 156, function(buffer){
		audio_sfx_pickup = buffer;
	});
	sonantxr_generate_sound(audio_ctx, sound_terminal, 156, function(buffer){
		audio_sfx_terminal = buffer;
	});
};

function audio_play(buffer, loop) {
	var source = audio_ctx.createBufferSource();
	source.buffer = buffer;
	source.loop = loop;
	source.connect(audio_ctx.destination);
	source.start();
};
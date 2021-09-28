

terminal_write_line('INITIATING...');

audio_init(function(){
	_document.onclick = function() {
		_document.onclick = null;
		terminal_cancel();
		terminal_write_line('INITIATING...', function(){
			renderer_init();
				
			load_image('q2', function() {
				terminal_hide();
				//console.log("renderer bind image complete.")
				renderer_bind_image(this);
				next_level(game_tick);
			});
			//console.log("Game loaded.")
		});
	};

	terminal_run_intro();
});



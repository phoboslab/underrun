
class entity_player_t extends entity_t {
	_init() {
		this._bob = this._last_shot = this._last_damage = this._frame = 0;
	}

	_update() {
		var t = this,
			speed = 128;

		// movement
		t.ax = keys[key_left] ? -speed : keys[key_right] ? speed : 0;
		t.az = keys[key_up] ? -speed : keys[key_down] ? speed : 0;

		// rotation - select appropriate sprite
		var angle = _math.atan2(
			mouse_y - (-34 + c.height * 0.8),
			mouse_x - (t.x + 6 + camera_x + c.width * 0.5)
		);
		t.s = 18 + ((angle / _math.PI * 4 + 10.5) % 8)|0;

		// bobbing
		t._bob += time_elapsed * 1.75 * (_math.abs(t.vx) + _math.abs(t.vz));
		t.y = _math.sin(t._bob) * 0.25;

		t._last_damage -= time_elapsed;
		t._last_shot -= time_elapsed;

		if (keys[key_shoot] && t._last_shot < 0) {
			audio_play(audio_sfx_shoot);
			new entity_plasma_t(t.x, 0, t.z, 0, 26, angle + _math.random() * 0.2 - 0.11);
			t._last_shot = 0.1;
		}

		super._update();
	}

	_render() {
		this._frame++;
		if (this._last_damage < 0 || this._frame % 6 < 4) {
			super._render();
		}
		push_light(this.x, 4, this.z + 6, 1,0.5,0, 0.04);
	}

	_kill() {
		super._kill();
		this.y = 10;
		this.z += 5;
		terminal_show_notice(
			'DEPLOYMENT FAILED\n' +
			'RESTORING BACKUP...'
		);
		setTimeout(reload_level, 3000);
	}

	_receive_damage(from, amount) {
		if (this._last_damage < 0) {
			audio_play(audio_sfx_hurt);
			super._receive_damage(from, amount);
			this._last_damage = 2;
		}
	}
}

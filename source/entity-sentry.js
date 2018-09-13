
class entity_sentry_t extends entity_t {
	_init() {
		this._select_target_counter = 0;
		this._target_x = this.x;
		this._target_z = this.z;
		this.h = 20;
	}
	
	_update() {
		var t = this,
			txd = t.x - t._target_x,
			tzd = t.z - t._target_z,
			xd = t.x - entity_player.x,
			zd = t.z - entity_player.z,
			dist = _math.sqrt(xd * xd + zd * zd);

		t._select_target_counter -= time_elapsed;

		// select new target after a while
		if (t._select_target_counter < 0) {
			if (dist < 64) {
				t._select_target_counter = _math.random() * 0.5 + 0.3;
				t._target_x = entity_player.x;
				t._target_z = entity_player.z;
			}
			if (dist < 48) {
				var angle = _math.atan2(
					entity_player.z - this.z,
					entity_player.x - this.x
				);
				new entity_sentry_plasma_t(t.x, 0, t.z, 0, 26, angle + _math.random() * 0.2 - 0.11);
			}
		}
		
		// set velocity towards target
		if (dist > 24) {
			t.ax = _math.abs(txd) > 2 ? (txd > 0 ? -48 : 48) : 0;
			t.az = _math.abs(tzd) > 2 ? (tzd > 0 ? -48 : 48) : 0;
		} else {
			t.ax = t.az = 0;
		}

		super._update();
	}

	_receive_damage(from, amount) {
		super._receive_damage(from, amount);
		this.vx = from.vx * 0.1;
		this.vz = from.vz * 0.1;
		this._spawn_particles(3);
	}
}

class entity_sentry_plasma_t extends entity_t {
	_init(angle) {
		var speed = 64;
		this.vx = _math.cos(angle) * speed;
		this.vz = _math.sin(angle) * speed;
	}

	_render() {
		super._render();
		push_light(this.x, 4, this.z + 6, 1.5, 0.2, 0.1, 0.04);
	}

	_did_collide() {
		this._kill();
	}

	_check(other) {
		if (other instanceof(entity_player_t)) {
			other._receive_damage(this, 1);
			this._kill();
		}
	}
}

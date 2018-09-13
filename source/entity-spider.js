
class entity_spider_t extends entity_t {
	_init() {
		this._animation_time = 0;
		this._select_target_counter = 0;
		this._target_x = this.x;
		this._target_z = this.z;
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
		if (t._select_target_counter < 0 && dist < 64) {
			t._select_target_counter = _math.random() * 0.5 + 0.3;
			t._target_x = entity_player.x;
			t._target_z = entity_player.z;
		}
		
		// set velocity towards target
		t.ax = _math.abs(txd) > 2 ? (txd > 0 ? -160 : 160) : 0;
		t.az = _math.abs(tzd) > 2 ? (tzd > 0 ? -160 : 160) : 0;

		super._update();
		this._animation_time += time_elapsed;
		this.s = 27 + ((this._animation_time*15)|0)%3;
	}

	_receive_damage(from, amount) {
		super._receive_damage(from, amount);
		this.vx = from.vx;
		this.vz = from.vz;
		this._spawn_particles(5);
	}

	_check(other) {
		// slightly bounce off from other spiders to separate them
		if (other instanceof entity_spider_t) {
			var 
				axis = (_math.abs(other.x - this.x) > _math.abs(other.z - this.z)
					? 'x' 
					: 'z'),
				amount = this[axis] > other[axis] ? 0.6 : -0.6;

			this['v'+axis] += amount;
			other['v'+axis] -= amount;
		}

		// hurt player
		else if (other instanceof entity_player_t) {
			this.vx *= -1.5;
			this.vz *= -1.5;
			other._receive_damage(this, 1);
		}
	}
}

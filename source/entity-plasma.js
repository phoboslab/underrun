// GLOBAL VARIABLES
var SPEED = 96;


class entity_plasma_t extends entity_t {
	_init(angle) {
		this.vx = _math.cos(angle) * SPEED;
		this.vz = _math.sin(angle) * SPEED;
	}

	_render() {
		super._render();
		push_light(this.x, 4, this.z + 6, 0.9, 0.2, 0.1, 0.04);
	}

	_did_collide() {
		this._kill();
	}

	_check(other) {
		if (other instanceof(entity_spider_t) || other instanceof(entity_sentry_t)) {
			audio_play(audio_sfx_hit);
			other._receive_damage(this, 1);
			this._kill();
		}
	}
}

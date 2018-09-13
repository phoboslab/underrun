
class entity_particle_t extends entity_t {
	_init(angle) {
		this._lifetime = 3;

	}

	_update() {
		this.ay = -320;

		if (this.y < 0) {
			this.y = 0;
			this.vy = -this.vy * 0.96;
		}
		super._update();
		this._lifetime -= time_elapsed;
		if (this._lifetime < 0) {
			this._kill();
		}
	}
}


class entity_explosion_t extends entity_t {
	_init() {
		this._lifetime = 1;
	}

	_update() {
		super._update();
		this._lifetime -= time_elapsed;
		if (this._lifetime < 0) {
			this._kill();
		}
	}

	_render() {
		push_light(this.x, 4, this.z + 6, 1,0.7,0.3, 0.08*(1-this._lifetime));
	}
}

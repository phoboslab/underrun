
class entity_health_t extends entity_t {
	_check(other) {
		if (other instanceof(entity_player_t)) {
			this._kill();
			other.h += other.h < 5 ? 1 : 0;
			audio_play(audio_sfx_pickup);
		}
	}
}

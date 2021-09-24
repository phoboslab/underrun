
var udef, // global undefined
	_math = Math,
	_document = document,
	_temp,

	keys = {37: 0, 38: 0, 39: 0, 40: 0},
	key_up = 38, key_down = 40, key_left = 37, key_right = 39, key_shoot = 512,
	key_convert = {65: 37, 87: 38, 68: 39, 83: 40}, // convert AWDS to left up down right
	mouse_x = 0, mouse_y = 0,

	time_elapsed,
	time_last = performance.now(),
	
	level_width = 64,
	level_height = 64,
	level_data = new Uint8Array(level_width * level_height),

	cpus_total = 0,
	cpus_rebooted = 0,

	current_level = 0,
	entity_player,
	entities = [],
	entities_to_kill = [];

function load_image(name, callback) {
	_temp = new Image();
	_temp.src = 'm/'+name+'.png';
	_temp.onload = callback;
}

function next_level(callback) {
	if (current_level == 3) {
		entities_to_kill.push(entity_player);
		terminal_run_outro();
	}
	else {
		current_level++;
		load_level(current_level, callback);
		
	}
}

function load_level(id, callback) {
	random_seed(0xBADC0DE1 + id);
	load_image('l'+id, function(){
		entities = [];
		num_verts = 0;
		num_lights = 0;

		cpus_total = 0;
		cpus_rebooted = 0;

		_temp = _document.createElement('canvas');
		_temp.width = _temp.height = level_width; // assume square levels
		_temp = _temp.getContext('2d')
		_temp.drawImage(this, 0, 0);
		_temp =_temp.getImageData(0, 0, level_width, level_height).data;

		for (var y = 0, index = 0; y < level_height; y++) {
			for (var x = 0; x < level_width; x++, index++) {

				// reduce to 12 bit color to accurately match
				var color_key = 
					((_temp[index*4]>>4) << 8) + 
					((_temp[index*4+1]>>4) << 4) + 
					(_temp[index*4+2]>>4);

				if (color_key !== 0) {
					var tile = level_data[index] =
						color_key === 0x888 // wall
								? random_int(0,5) < 4 ? 8 : random_int(8, 17)
								: array_rand([1,1,1,1,1,3,3,2,5,5,5,5,5,5,7,7,6]); // floor


					if (tile > 7) { // walls
						push_block(x * 8, y * 8, 4, tile-1);
					}
					else if (tile > 0) { // floor
						push_floor(x * 8, y * 8, tile-1);

						// enemies and items
						if (random_int(0, 16 - (id * 2)) == 0) {
							new entity_spider_t(x*8, 0, y*8, 5, 27);
						}
						else if (random_int(0, 100) == 0) {
							new entity_health_t(x*8, 0, y*8, 5, 31);
						}
					}

					// cpu
					if (color_key === 0x00f) {
						level_data[index] = 8;
						new entity_cpu_t(x*8, 0, y*8, 0, 18);
						cpus_total++;
					}

					// sentry
					if (color_key === 0xf00) {
						new entity_sentry_t(x*8, 0, y*8, 5, 32);
					}

					// player start position (blue)
					if (color_key === 0x0f0) {
						entity_player = new entity_player_t(x*8, 0, y*8, 5, 18);	
					}
				}
			}
		}

		// Remove all spiders that spawned close to the player start
		for (var i = 0; i < entities.length; i++) {
			var e = entities[i];
			if (
				e instanceof(entity_spider_t) &&
				_math.abs(e.x - entity_player.x) < 64 &&
				_math.abs(e.z - entity_player.z) < 64
			) {
				entities_to_kill.push(e);
			}
		}

		camera_x = -entity_player.x;
		camera_y = -300;
		camera_z = -entity_player.z - 100;

		level_num_verts = num_verts;

		terminal_show_notice(
			'SCANNING FOR OFFLINE SYSTEMS...___' +
			(cpus_total)+' SYSTEMS FOUND'
		);
		callback && callback();
	});
}

function reload_level() {
	load_level(current_level);
}

function preventDefault(ev) {
	ev.preventDefault();
}

_document.onkeydown = function(ev){
	_temp = ev.keyCode;
	_temp = key_convert[_temp] || _temp;
	if (keys[_temp] !== udef) {
		keys[_temp] = 1;
		preventDefault(ev);
	}
}

_document.onkeyup = function(ev) {
	_temp = ev.keyCode;
	_temp = key_convert[_temp] || _temp;
	if (keys[_temp] !== udef) {
		keys[_temp] = 0;
		preventDefault(ev);
	}
}

_document.onmousemove = function(ev) {
	mouse_x = (ev.clientX / c.clientWidth) * c.width;
	mouse_y = (ev.clientY / c.clientHeight) * c.height;
}

_document.onmousedown = function(ev) {
	keys[key_shoot] = 1;
	preventDefault(ev);
}

_document.onmouseup = function(ev) {
	keys[key_shoot] = 0;
	preventDefault(ev);
}

function game_tick() {
	var time_now = performance.now();
	time_elapsed = (time_now - time_last)/1000;
	time_last = time_now;

	renderer_prepare_frame();

	// update and render entities
	for (var i = 0, e1, e2; i < entities.length; i++) {
		e1 = entities[i];
		if (e1._dead) { continue; }
		e1._update();

		// check for collisions between entities - it's quadratic and nobody cares \o/
		for (var j = i+1; j < entities.length; j++) {
			e2 = entities[j];
			if(!(
				e1.x >= e2.x + 9 ||
				e1.x + 9 <= e2.x ||
				e1.z >= e2.z + 9 ||
				e1.z + 9 <= e2.z
			)) {
				e1._check(e2);
				e2._check(e1);
			}
		}

		e1._render();		
	}

	// center camera on player, apply damping
	camera_x = camera_x * 0.92 - entity_player.x * 0.08;
	camera_y = camera_y * 0.92 - entity_player.y * 0.08;
	camera_z = camera_z * 0.92 - entity_player.z * 0.08;

	// add camera shake
	camera_shake *= 0.9;
	camera_x += camera_shake * (_math.random()-0.5);
	camera_z += camera_shake * (_math.random()-0.5);

	// health bar, render with plasma sprite
	for (var i = 0; i < entity_player.h; i++) {
		push_sprite(-camera_x - 50 + i * 4, 29-camera_y, -camera_z-30, 26);
	}

	renderer_end_frame();


	// remove dead entities
	entities = entities.filter(function(entity) {
		return entities_to_kill.indexOf(entity) === -1;
	});
	entities_to_kill = [];

	requestAnimationFrame(game_tick);
}
var rand_high, rand_low;

function random_int(min, max) {
	rand_high = ((rand_high << 16) + (rand_high >> 16) + rand_low) & 0xffffffff;
	rand_low = (rand_low + rand_high) & 0xffffffff;
	var n = (rand_high >>> 0) / 0xffffffff;
	return (min + n * (max-min+1))|0;
}

function random_seed(seed) {
	rand_high = seed || 0xBADC0FFE;
	rand_low = seed ^ 0x49616E42;
}

function array_rand(array) {
	return array[random_int(0, array.length-1)];
}

var
	gl = c.getContext('webgl') || c.getContext('experimental-webgl'),
	vertex_buffer,
	shader_program,

	texture_size = 1024,
	tile_size = 16,
	tile_fraction = tile_size / texture_size,
	px_nudge = 0.5 / texture_size,
	
	max_verts = 1024 * 64,
	num_verts = 0,
	level_num_verts,
	buffer_data = new Float32Array(max_verts*8), // allow 64k verts, 8 properties per vert

	light_uniform,
	max_lights = 16,
	num_lights = 0,
	light_data = new Float32Array(max_lights*7), // 32 lights, 7 properties per light


	camera_x = 0, camera_y = 0, camera_z = 0, camera_shake = 0,
	camera_uniform,	

	shader_attribute_vec = 'attribute vec',
	shader_varying = 
		'precision highp float;' +
		'varying vec3 vl;' +
		'varying vec2 vuv;',
	shader_uniform = 'uniform ',
	shader_const_mat4 = "const mat4 ",

	vertex_shader = 
		shader_varying + 
		shader_attribute_vec + "3 p;" +
		shader_attribute_vec + "2 uv;" +
		shader_attribute_vec + "3 n;" +
		shader_uniform + "vec3 cam;" +
		shader_uniform + "float l[7*"+max_lights+"];" +
		shader_const_mat4 + "v=mat4(1,0,0,0,0,.707,.707,0,0,-.707,.707,0,0,-22.627,-22.627,1);" + // view
		shader_const_mat4 + "r=mat4(.977,0,0,0,0,1.303,0,0,0,0,-1,-1,0,0,-2,0);"+ // projection
		"void main(void){" +
			"vl=vec3(0.3,0.3,0.6);" + // ambient color
			"for(int i=0; i<"+max_lights+"; i++) {"+
				"vec3 lp=vec3(l[i*7],l[i*7+1],l[i*7+2]);" + // light position
				"vl+=vec3(l[i*7+3],l[i*7+4],l[i*7+5])" + // light color *
					"*max(dot(n,normalize(lp-p)),0.)" + // diffuse *
					"*(1./(l[i*7+6]*(" + // attentuation *
						"length(lp-p)" + // distance
					")));" + 
			"}" +
			"vuv=uv;" +
			"gl_Position=r*v*(vec4(p+cam,1.));" +
		"}",

	fragment_shader =
		shader_varying + 
		shader_uniform + "sampler2D s;" +
		"void main(void){" +
			"vec4 t=texture2D(s,vuv);" +
			"if(t.a<.8)" + // 1) discard alpha
				"discard;" + 
			"if(t.r>0.95&&t.g>0.25&&t.b==0.0)" + // 2) red glowing spider eyes
				"gl_FragColor=t;" +
			"else{" +  // 3) calculate color with lights and fog
				"gl_FragColor=t*vec4(vl,1.);" +
				"gl_FragColor.rgb*=smoothstep(" +
					"112.,16.," + // fog far, near
					"gl_FragCoord.z/gl_FragCoord.w" + // fog depth
				");" +
			"}" +
			"gl_FragColor.rgb=floor(gl_FragColor.rgb*6.35)/6.35;" + // reduce colors to ~256
		"}";


function renderer_init() {

	// Create shorthand WebGL function names
	// var webglShortFunctionNames = {};
	for (var name in gl) {
		if (gl[name].length != udef) {
			gl[name.match(/(^..|[A-Z]|\d.|v$)/g).join('')] = gl[name];
			// webglShortFunctionNames[name] = 'gl.'+name.match(/(^..|[A-Z]|\d.|v$)/g).join('');
		}
	}
	// console.log(JSON.stringify(webglShortFunctionNames, null, '\t'));

	vertex_buffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, vertex_buffer);
	gl.bufferData(gl.ARRAY_BUFFER, buffer_data, gl.DYNAMIC_DRAW);

	shader_program = gl.createProgram();
	gl.attachShader(shader_program, compile_shader(gl.VERTEX_SHADER, vertex_shader));
	gl.attachShader(shader_program, compile_shader(gl.FRAGMENT_SHADER, fragment_shader));
	gl.linkProgram(shader_program);
	gl.useProgram(shader_program);

	camera_uniform = gl.getUniformLocation(shader_program, "cam");
	light_uniform = gl.getUniformLocation(shader_program, "l");

	gl.enable(gl.DEPTH_TEST);
	gl.enable(gl.BLEND);
	gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
	gl.viewport(0,0,c.width,c.height);

	enable_vertex_attrib('p', 3, 8, 0);
	enable_vertex_attrib('uv', 2, 8, 3);
	enable_vertex_attrib('n', 3, 8, 5);
}

function renderer_bind_image(image) {
	var texture_2d = gl.TEXTURE_2D;
	gl.bindTexture(texture_2d, gl.createTexture());
	gl.texImage2D(texture_2d, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
	gl.texParameteri(texture_2d, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
	gl.texParameteri(texture_2d, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
	gl.texParameteri(texture_2d, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(texture_2d, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
}

function renderer_prepare_frame() {
	num_verts = level_num_verts;
	num_lights = 0;

	// reset all lights
	light_data.fill(1);
}

function renderer_end_frame() {
	gl.uniform3f(camera_uniform, camera_x, camera_y - 10, camera_z-30);
	gl.uniform1fv(light_uniform, light_data);

	gl.clearColor(0,0,0,1);
	gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);

	gl.bufferData(gl.ARRAY_BUFFER, buffer_data, gl.DYNAMIC_DRAW);
	gl.drawArrays(gl.TRIANGLES, 0, num_verts);
};

function push_quad(x1, y1, z1, x2, y2, z2, x3, y3, z3, x4, y4, z4, nx, ny, nz, tile) {
	var u = tile * tile_fraction + px_nudge;
	buffer_data.set([
		x1, y1, z1, u, 0, nx, ny, nz,
		x2, y2, z2, u + tile_fraction - px_nudge, 0, nx, ny, nz,
		x3, y3, z3, u, 1, nx, ny, nz,
		x2, y2, z2, u + tile_fraction - px_nudge, 0, nx, ny, nz,
		x3, y3, z3, u, 1, nx, ny, nz,
		x4, y4, z4, u + tile_fraction - px_nudge, 1, nx, ny, nz
	], num_verts * 8);
	num_verts += 6;
};

function push_sprite(x, y, z, tile) {
	// Only push sprites near to the camera
	if (
		_math.abs(-x - camera_x) < 128 && 
		_math.abs(-z - camera_z) < 128
	) {
		var tilt = 3+(camera_z + z)/12; // tilt sprite when closer to camera
		push_quad(x, y + 6, z, x + 6, y + 6, z, x, y, z + tilt, x + 6, y, z + tilt, 0, 0, 1, tile);
	}
}

function push_floor(x, z, tile) {
	push_quad(x, 0, z, x + 8, 0, z, x, 0, z + 8, x + 8, 0, z + 8, 0,1,0, tile);
};

function push_block(x, z, tile_top, tile_sites) {
	// tall blocks for certain tiles
	var y = ~[8, 9, 17].indexOf(tile_sites) ? 16 : 8;

	push_quad(x, y, z, x + 8, y, z, x, y, z + 8, x + 8, y, z + 8, 0, 1, 0, tile_top); // top
	push_quad(x + 8, y, z, x + 8, y, z + 8, x + 8, 0, z, x + 8, 0, z + 8, 1, 0, 0, tile_sites); // right
	push_quad(x, y, z + 8, x + 8, y, z + 8, x, 0, z + 8, x + 8, 0, z + 8, 0, 0, 1, tile_sites); // front
	push_quad(x, y, z, x, y, z + 8, x, 0, z, x, 0, z + 8, -1, 0, 0, tile_sites); // left
};

function push_light(x, y, z, r, g, b, falloff) {
	// Only push lights near to the camera
	var max_light_distance = (128 + 1/falloff); // cheap ass approximation
	if (
		num_lights < max_lights &&
		_math.abs(-x - camera_x) < max_light_distance &&
		_math.abs(-z - camera_z) < max_light_distance
	) {
		light_data.set([x, y, z, r, g, b, falloff], num_lights*7);
		num_lights++;
	}
}

function compile_shader(shader_type, shader_source) {
	var shader = gl.createShader(shader_type);
	gl.shaderSource(shader, shader_source);
	gl.compileShader(shader);
	// console.log(gl.getShaderInfoLog(shader));
	return shader;
};

function enable_vertex_attrib(attrib_name, count, vertex_size, offset) {
	var location = gl.getAttribLocation(shader_program, attrib_name);
	gl.enableVertexAttribArray(location);
	gl.vertexAttribPointer(location, count, gl.FLOAT, false, vertex_size * 4, offset * 4);
};

class entity_t {
	constructor(x, y, z, friction, sprite, init_param) {
		var t = this;
		t.x = x; t.y = y; t.z = z;
		t.vx = t.vy = t.vz = t.ax = t.ay = t.az = 0;
		t.f = friction;
		t.s = sprite;
		t.h = 5;

		t._init(init_param);
		entities.push(t);
	}

	// separate _init() method, because "constructor" cannot be uglyfied
	_init(init_param) {}

	_update() {
		var t = this,
			last_x = t.x, last_z = t.z;

		// velocity
		t.vx += t.ax * time_elapsed - t.vx * _math.min(t.f * time_elapsed, 1);
		t.vy += t.ay * time_elapsed - t.vy * _math.min(t.f * time_elapsed, 1);
		t.vz += t.az * time_elapsed - t.vz * _math.min(t.f * time_elapsed, 1);
		
		// position
		t.x += t.vx * time_elapsed;
		t.y += t.vy * time_elapsed;
		t.z += t.vz * time_elapsed;

		// check wall collissions, horizontal
		if (t._collides(t.x, last_z)) {
			t._did_collide(t.x, t.y);
			t.x = last_x;
			t.vx = 0;
		}

		// check wall collissions, vertical
		if (t._collides(t.x, t.z)) {
			t._did_collide(t.x, t.y);
			t.z = last_z;
			t.vz = 0;
		}
	}

	_collides(x, z) {
		return level_data[(x >> 3) + (z >> 3) * level_width] > 7 || // top left
			level_data[((x + 6) >> 3) + (z >> 3) * level_width] > 7 || // top right
			level_data[((x + 6) >> 3) + ((z+4) >> 3) * level_width] > 7 || // bottom right
			level_data[(x >> 3) + ((z+4) >> 3) * level_width] > 7; // bottom left
	}

	_spawn_particles(amount) {
		for (var i = 0; i < amount; i++) {
			var particle = new entity_particle_t(this.x, 0, this.z, 1, 30);
			particle.vx = (_math.random() - 0.5) * 128;
			particle.vy = _math.random() * 96;
			particle.vz = (_math.random() - 0.5) * 128;
		}
	}

	// collision against static walls
	_did_collide() {} 

	// collision against other entities
	_check(other) {}

	_receive_damage(from, amount) {
		this.h -= amount;
		if (this.h <= 0) {
			this._kill();
		}
	}

	_kill() {
		if (!this._dead) {
			this._dead = true;
			entities_to_kill.push(this);
		}
	}

	_render() { // render
		var t = this;
		push_sprite(t.x-1, t.y, t.z, t.s);
	}
}

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

class entity_cpu_t extends entity_t {
	_init() {
		this._animation_time = 0;
	}

	_render() {
		this._animation_time += time_elapsed;

		push_block(this.x, this.z, 4, 17);
		var intensity = this.h == 5 
			? 0.02 + _math.sin(this._animation_time*10+_math.random()*2) * 0.01
			: 0.01;
		push_light(this.x + 4, 4, this.z + 12, 0.2, 0.4, 1.0, intensity);
	}

	_check(other) {

		if (this.h == 5 && other instanceof(entity_player_t)) {
			this.h = 10;
			cpus_rebooted++;

			var reboot_message = 
				'\n\n\nREBOOTING..._' +
				'SUCCESS\n';

			if (cpus_total-cpus_rebooted > 0) {
				terminal_show_notice(
					reboot_message + 
					(cpus_total-cpus_rebooted)+' SYSTEM(S) STILL OFFLINE'
				);
			}
			else {
				if (current_level != 3) {
					terminal_show_notice(
						reboot_message +
						'ALL SYSTEMS ONLINE\n' +
						'TRIANGULATING POSITION FOR NEXT HOP...___' +
						'TARGET ACQUIRED\n' +
						'JUMPING...',
						next_level
					);
				}
				else {
					terminal_show_notice(
						reboot_message +
						'ALL SYSTEMS ONLINE',
						next_level
					);
				}
			}
			audio_play(audio_sfx_beep);
		}
	}
}

class entity_plasma_t extends entity_t {
	_init(angle) {
		var speed = 96;
		this.vx = _math.cos(angle) * speed;
		this.vz = _math.sin(angle) * speed;
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

	_kill() {
		super._kill();
		new entity_explosion_t(this.x, 0, this.z, 0, 26);
		camera_shake = 1;
		audio_play(audio_sfx_explode);
	}
}

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

	_kill() {
		super._kill();
		new entity_explosion_t(this.x, 0, this.z, 0, 26);
		camera_shake = 3;
		audio_play(audio_sfx_explode);
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

class entity_particle_t extends entity_t {
	_init() {
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

class entity_health_t extends entity_t {
	_check(other) {
		if (other instanceof(entity_player_t)) {
			this._kill();
			other.h += other.h < 5 ? 1 : 0;
			audio_play(audio_sfx_pickup);
		}
	}
}

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
// Gutted for js13k and modified to use Float32 buffers directly 
// ~ Dominic Szablewski, phoboslab.org, Sep 2018

//
// Sonant-X
//
// Copyright (c) 2014 Nicolas Vanhoren
//
// Sonant-X is a fork of js-sonant by Marcus Geelnard and Jake Taylor. It is
// still published using the same license (zlib license, see below).
//
// Copyright (c) 2011 Marcus Geelnard
// Copyright (c) 2008-2009 Jake Taylor
//
// This software is provided 'as-is', without any express or implied
// warranty. In no event will the authors be held liable for any damages
// arising from the use of this software.
//
// Permission is granted to anyone to use this software for any purpose,
// including commercial applications, and to alter it and redistribute it
// freely, subject to the following restrictions:
//
// 1. The origin of this software must not be misrepresented; you must not
//	claim that you wrote the original software. If you use this software
//	in a product, an acknowledgment in the product documentation would be
//	appreciated but is not required.
//
// 2. Altered source versions must be plainly marked as such, and must not be
//	misrepresented as being the original software.
//
// 3. This notice may not be removed or altered from any source
//	distribution.

var sonantxr_generate_song, sonantxr_generate_sound;

(function() {
var WAVE_SPS = 44100;					// Samples per second
var MAX_TIME = 33; // maximum time, in millis, that the generator can use consecutively

var audioCtx = null;

// Oscillators
function osc_sin(value)
{
	return _math.sin(value * 6.283184);
}

function osc_square(value)
{
	return osc_sin(value) < 0 ? -1 : 1;
}

function osc_saw(value)
{
	return (value % 1) - 0.5;
}

function osc_tri(value)
{
	var v2 = (value % 1) * 4;
	return v2 < 2 ? v2 - 1 : 3 - v2;
}

// Array of oscillator functions
var oscillators =
[
	osc_sin,
	osc_square,
	osc_saw,
	osc_tri
];

function getnotefreq(n)
{
	return 0.00390625 * _math.pow(1.059463094, n - 128);
}

function generateBuffer(samples) {
   return {
		left: new Float32Array(samples),
		right: new Float32Array(samples)
	};
}

function applyDelay(chnBuf, waveSamples, instr, rowLen) {
	var p1 = (instr.fx_delay_time * rowLen) >> 1;
	var t1 = instr.fx_delay_amt / 255;

	var n1 = 0;
	while(n1 < waveSamples - p1) {
		var b1 = n1;
		var l = (n1 + p1);
		chnBuf.left[l] += chnBuf.right[b1] * t1;
		chnBuf.right[l] += chnBuf.left[b1] * t1;
		n1++;
	}
}


function getAudioBuffer(ctx, mixBuf) {
	var buffer = ctx.createBuffer(2, mixBuf.left.length, WAVE_SPS); // Create Mono Source Buffer from Raw Binary
	buffer.getChannelData(0).set(mixBuf.left);
	buffer.getChannelData(1).set(mixBuf.right);
	return buffer;
}

var SoundGenerator = function(ctx, instr, rowLen) {
	this.ctx = ctx;
	this.instr = instr;
	this.rowLen = rowLen || 5605;

	this.osc_lfo = oscillators[instr.lfo_waveform];
	this.osc1 = oscillators[instr.osc1_waveform];
	this.osc2 = oscillators[instr.osc2_waveform];
	this.attack = instr.env_attack;
	this.sustain = instr.env_sustain;
	this.release = instr.env_release;
	this.panFreq = _math.pow(2, instr.fx_pan_freq - 8) / this.rowLen;
	this.lfoFreq = _math.pow(2, instr.lfo_freq - 8) / this.rowLen;
};

SoundGenerator.prototype._genSound = function(n, chnBuf, currentpos) {
	var c1 = 0;
	var c2 = 0;

	// Precalculate frequencues
	var o1t = getnotefreq(n + (this.instr.osc1_oct - 8) * 12 + this.instr.osc1_det) * (1 + 0.0008 * this.instr.osc1_detune);
	var o2t = getnotefreq(n + (this.instr.osc2_oct - 8) * 12 + this.instr.osc2_det) * (1 + 0.0008 * this.instr.osc2_detune);

	// State variable init
	var q = this.instr.fx_resonance / 255;
	var low = 0;
	var band = 0;

	var chnbufLength = chnBuf.left.length;
	var numSamples = this.attack + this.sustain + this.release - 1;
	
	for (var j = numSamples; j >= 0; --j) {
		var k = j + currentpos;

		// LFO
		var lfor = this.osc_lfo(k * this.lfoFreq) * this.instr.lfo_amt / 512 + 0.5;

		// Envelope
		var e = 1;
		if (j < this.attack) {
			e = j / this.attack;
		}
		else if (j >= this.attack + this.sustain) {
			e -= (j - this.attack - this.sustain) / this.release;
		}

		// Oscillator 1
		var t = o1t;
		if (this.instr.lfo_osc1_freq) {
			t += lfor;
		}
		if (this.instr.osc1_xenv) {
			t *= e * e 
		}
		c1 += t;
		var rsample = this.osc1(c1) * this.instr.osc1_vol;

		// Oscillator 2
		t = o2t;
		if (this.instr.osc2_xenv) {
			t *= e * e;
		};
		c2 += t;
		rsample += this.osc2(c2) * this.instr.osc2_vol;

		// Noise oscillator
		if (this.instr.noise_fader) {
			rsample += (2*_math.random()-1) * this.instr.noise_fader * e;
		}

		rsample *= e / 255;

		// State variable filter
		var f = this.instr.fx_freq;
		if (this.instr.lfo_fx_freq) {
			f *= lfor;
		}
		f = 1.5 * _math.sin(f * 3.141592 / WAVE_SPS);
		low += f * band;
		var high = q * (rsample - band) - low;
		band += f * high;
		switch (this.instr.fx_filter) {
			case 1: // Hipass
				rsample = high;
				break;
			case 2: // Lopass
				rsample = low;
				break;
			case 3: // Bandpass
				rsample = band;
				break;
			case 4: // Notch
				rsample = low + high;
				break;
			default:
		}

		// Panning & master volume
		t = osc_sin(k * this.panFreq) * this.instr.fx_pan_amt / 512 + 0.5;
		rsample *= 0.00476 * this.instr.env_master; // 39 / 8192 = 0.00476

		// Add to 16-bit channel buffer
		// k = k * 2;
		if (k < chnbufLength) {
			chnBuf.left[k] += rsample * (1-t) ;
			chnBuf.right[k] += rsample * t;
		}
	}
};

SoundGenerator.prototype._createAudioBuffer = function(n, callBack) {
	var bufferSize = (this.attack + this.sustain + this.release - 1) + (32 * this.rowLen);
	var buffer = generateBuffer(bufferSize);
	this._genSound(n, buffer, 0);
	applyDelay(buffer, bufferSize, this.instr, this.rowLen);

	callBack(getAudioBuffer(this.ctx, buffer));
};




var MusicGenerator = function(ctx, song) {
	this.ctx = ctx;
	this.song = song;
	// Wave data configuration
	this.waveSize = WAVE_SPS * song.songLen; // Total song size (in samples)
};

MusicGenerator.prototype._generateTrack = function (instr, mixBuf, callBack) {
	var self = this;
	var chnBuf = generateBuffer(this.waveSize);
	// Preload/precalc some properties/expressions (for improved performance)
	var waveSamples = self.waveSize,
		rowLen = self.song.rowLen,
		endPattern = self.song.endPattern,
		soundGen = new SoundGenerator(self.ctx, instr, rowLen);

	var currentpos = 0;
	var p = 0;
	var row = 0;
	var recordSounds = function() {
		var beginning = Date.now();
		while (true) {
			if (row === 32) {
				row = 0;
				p += 1;
				continue;
			}
			if (p === endPattern - 1) {
				return finalize();
			}
			var cp = instr.p[p];
			if (cp) {
				var n = instr.c[cp - 1].n[row];
				if (n) {
					soundGen._genSound(n, chnBuf, currentpos);
				}
			}
			currentpos += rowLen;
			row += 1;
			if (Date.now() - beginning > MAX_TIME) {
				setTimeout(recordSounds, 0);
				return;
			}
		}
	};

	var finalize = function() {
		applyDelay(chnBuf, waveSamples, instr, rowLen);
		for (var b2 = 0; b2 < waveSamples; b2++) {
			mixBuf.left[b2] += chnBuf.left[b2];
		}
		for (var b2 = 0; b2 < waveSamples; b2++) {
			mixBuf.right[b2] += chnBuf.right[b2];
		}
		callBack();
	};

	recordSounds();
};

MusicGenerator.prototype._createAudioBuffer = function(callBack) {
	var self = this;
	var mixBuf = generateBuffer(this.waveSize);
	var track = 0;

	var nextTrack = function() {
		if (track < self.song.songData.length) {
			track += 1;
			self._generateTrack(self.song.songData[track - 1], mixBuf, nextTrack);
		}
		else {
			callBack(getAudioBuffer(self.ctx, mixBuf));
		}
	};
	nextTrack();
};


sonantxr_generate_song = function(audio_ctx, song_data, callback) {
	var music_generator = new MusicGenerator(audio_ctx, song_data);
	music_generator._createAudioBuffer(callback);
};

sonantxr_generate_sound = function(audio_ctx, instrument, note, callback) {
	var sound_generator = new SoundGenerator(audio_ctx, instrument);
	sound_generator._createAudioBuffer(note, callback);
};

})();

var music_dark_meat_beat = {
	rowLen: 5513,
	endPattern: 25,
	songData: [
		{
			osc1_oct: 7,
			osc1_det: 0,
			osc1_detune: 0,
			osc1_xenv: 0,
			osc1_vol: 255,
			osc1_waveform: 2,
			osc2_oct: 8,
			osc2_det: 0,
			osc2_detune: 18,
			osc2_xenv: 0,
			osc2_vol: 255,
			osc2_waveform: 3,
			noise_fader: 0,
			env_attack: 21074,
			env_sustain: 56363,
			env_release: 100000,
			env_master: 199,
			fx_filter: 2,
			fx_freq: 948,
			fx_resonance: 92,
			fx_delay_time: 7,
			fx_delay_amt: 60,
			fx_pan_freq: 3,
			fx_pan_amt: 100,
			lfo_osc1_freq: 0,
			lfo_fx_freq: 1,
			lfo_freq: 7,
			lfo_amt: 138,
			lfo_waveform: 3,
			p: [2,3,4,5,2,3,4,5,2,3,4,5,2,3,4,5,2,3,4,5,2,3,4,5],
			c: [
				{
					n: [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]
				},
				{
					n: [122,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,121,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]
				},
				{
					n: [114,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]
				},
				{
					n: [119,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,121,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]
				},
				{
					n: [114,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,117,0,0,0,0,0,0,0]
				}
			]
		},
		{
			osc1_oct: 7,
			osc1_det: 0,
			osc1_detune: 0,
			osc1_xenv: 0,
			osc1_vol: 192,
			osc1_waveform: 3,
			osc2_oct: 4,
			osc2_det: 0,
			osc2_detune: 0,
			osc2_xenv: 0,
			osc2_vol: 57,
			osc2_waveform: 0,
			noise_fader: 0,
			env_attack: 100,
			env_sustain: 150,
			env_release: 13636,
			env_master: 191,
			fx_filter: 2,
			fx_freq: 5839,
			fx_resonance: 254,
			fx_delay_time: 4,
			fx_delay_amt: 121,
			fx_pan_freq: 6,
			fx_pan_amt: 147,
			lfo_osc1_freq: 0,
			lfo_fx_freq: 0,
			lfo_freq: 6,
			lfo_amt: 195,
			lfo_waveform: 0,
			p: [2,0,2,0,2,0,2,0,2,0,2,0,2,0,2,0,2,0,2],
			c: [
				{
					n: [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]
				},
				{
					n: [131,0,131,0,131,0,0,0,133,0,134,0,134,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]
				}
			]
		},
		{
			osc1_oct: 7,
			osc1_det: 2,
			osc1_detune: 0,
			osc1_xenv: 1,
			osc1_vol: 196,
			osc1_waveform: 0,
			osc2_oct: 7,
			osc2_det: 0,
			osc2_detune: 0,
			osc2_xenv: 1,
			osc2_vol: 255,
			osc2_waveform: 0,
			noise_fader: 0,
			env_attack: 100,
			env_sustain: 0,
			env_release: 3636,
			env_master: 254,
			fx_filter: 2,
			fx_freq: 612,
			fx_resonance: 254,
			fx_delay_time: 6,
			fx_delay_amt: 27,
			fx_pan_freq: 0,
			fx_pan_amt: 0,
			lfo_osc1_freq: 0,
			lfo_fx_freq: 0,
			lfo_freq: 0,
			lfo_amt: 0,
			lfo_waveform: 0,
			p: [1,1,1,1,1,1,1,1,1,1,1,1],
			c: [
				{
					n: [140,0,0,0,0,0,0,0,140,0,0,0,0,0,0,0,140,0,0,0,0,0,0,0,140,0,0,0,0,0,0,0]
				}
			]
		},
		{
			osc1_oct: 7,
			osc1_det: 0,
			osc1_detune: 0,
			osc1_xenv: 0,
			osc1_vol: 77,
			osc1_waveform: 1,
			osc2_oct: 2,
			osc2_det: 0,
			osc2_detune: 188,
			osc2_xenv: 0,
			osc2_vol: 7,
			osc2_waveform: 0,
			noise_fader: 21,
			env_attack: 53732,
			env_sustain: 0,
			env_release: 14545,
			env_master: 13,
			fx_filter: 0,
			fx_freq: 0,
			fx_resonance: 240,
			fx_delay_time: 2,
			fx_delay_amt: 222,
			fx_pan_freq: 3,
			fx_pan_amt: 47,
			lfo_osc1_freq: 0,
			lfo_fx_freq: 0,
			lfo_freq: 0,
			lfo_amt: 0,
			lfo_waveform: 0,
			p: [0,0,0,0,2,4,2,3,2,4,2,3,2,4,2,3,2,4,2,3,2,4,2,3],
			c: [
				{
					n: [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]
				},
				{
					n: [131,0,131,0,131,0,0,0,133,0,134,0,134,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]
				},
				{
					n: [131,0,131,0,131,0,0,0,136,0,134,0,133,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]
				},
				{
					n: [131,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]
				}
			]
		},
		{
			osc1_oct: 5,
			osc1_det: 0,
			osc1_detune: 0,
			osc1_xenv: 1,
			osc1_vol: 20,
			osc1_waveform: 0,
			osc2_oct: 7,
			osc2_det: 0,
			osc2_detune: 0,
			osc2_xenv: 1,
			osc2_vol: 7,
			osc2_waveform: 0,
			noise_fader: 178,
			env_attack: 0,
			env_sustain: 6338,
			env_release: 15454,
			env_master: 100,
			fx_filter: 3,
			fx_freq: 4352,
			fx_resonance: 240,
			fx_delay_time: 4,
			fx_delay_amt: 99,
			fx_pan_freq: 0,
			fx_pan_amt: 20,
			lfo_osc1_freq: 0,
			lfo_fx_freq: 1,
			lfo_freq: 7,
			lfo_amt: 64,
			lfo_waveform: 0,
			p: [0,0,0,0,1,1,1,1,1,1,1,1],
			c: [
				{
					n: [0,0,0,0,0,0,0,0,137,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,137,0,0,0,0,0,0,0]
				}
			]
		},
		{
			osc1_oct: 8,
			osc1_det: 0,
			osc1_detune: 0,
			osc1_xenv: 1,
			osc1_vol: 82,
			osc1_waveform: 2,
			osc2_oct: 8,
			osc2_det: 0,
			osc2_detune: 0,
			osc2_xenv: 0,
			osc2_vol: 0,
			osc2_waveform: 0,
			noise_fader: 125,
			env_attack: 100,
			env_sustain: 0,
			env_release: 9090,
			env_master: 232,
			fx_filter: 3,
			fx_freq: 5200,
			fx_resonance: 63,
			fx_delay_time: 4,
			fx_delay_amt: 131,
			fx_pan_freq: 0,
			fx_pan_amt: 0,
			lfo_osc1_freq: 0,
			lfo_fx_freq: 0,
			lfo_freq: 0,
			lfo_amt: 0,
			lfo_waveform: 0,
			p: [0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,1,0,0,0,1],
			c: [
				{
					n: [141,141,141,141,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]
				}
			]
		}
	],
	songLen: 101
};var 
	sound_terminal = {
		osc1_oct: 6,
		osc1_det: 0,
		osc1_detune: 0,
		osc1_xenv: 0,
		osc1_vol: 0,
		osc1_waveform: 0,
		osc2_oct: 10,
		osc2_det: 0,
		osc2_detune: 0,
		osc2_xenv: 0,
		osc2_vol: 168,
		osc2_waveform: 3,
		noise_fader: 0,
		env_attack: 351,
		env_sustain: 0,
		env_release: 444,
		env_master: 192,
		fx_filter: 2,
		fx_freq: 7355,
		fx_resonance: 130,
		fx_delay_time: 3,
		fx_delay_amt: 36,
		fx_pan_freq: 0,
		fx_pan_amt: 0,
		lfo_osc1_freq: 0,
		lfo_fx_freq: 0,
		lfo_freq: 0,
		lfo_amt: 0,
		lfo_waveform: 0
	},
	
	sound_shoot = {
		osc1_oct: 7,
		osc1_det: 0,
		osc1_detune: 0,
		osc1_xenv: 0,
		osc1_vol: 192,
		osc1_waveform: 0,
		osc2_oct: 2,
		osc2_det: 0,
		osc2_detune: 0,
		osc2_xenv: 0,
		osc2_vol: 192,
		osc2_waveform: 0,
		noise_fader: 28,
		env_attack: 269,
		env_sustain: 0,
		env_release: 444,
		env_master: 255,
		fx_filter: 0,
		fx_freq: 272,
		fx_resonance: 25,
		fx_delay_time: 5,
		fx_delay_amt: 29,
		fx_pan_freq: 0,
		fx_pan_amt: 47,
		lfo_osc1_freq: 0,
		lfo_fx_freq: 0,
		lfo_freq: 0,
		lfo_amt: 0,
		lfo_waveform: 0
	},

	sound_hit = {
		osc1_oct: 8,
		osc1_det: 0,
		osc1_detune: 0,
		osc1_xenv: 1,
		osc1_vol: 160,
		osc1_waveform: 3,
		osc2_oct: 8,
		osc2_det: 0,
		osc2_detune: 0,
		osc2_xenv: 1,
		osc2_vol: 99,
		osc2_waveform: 2,
		noise_fader: 60,
		env_attack: 50,
		env_sustain: 200,
		env_release: 6800,
		env_master: 125,
		fx_filter: 4,
		fx_freq: 11025,
		fx_resonance: 254,
		fx_delay_time: 0,
		fx_delay_amt: 13,
		fx_pan_freq: 5,
		fx_pan_amt: 0,
		lfo_osc1_freq: 0,
		lfo_fx_freq: 1,
		lfo_freq: 4,
		lfo_amt: 60,
		lfo_waveform: 0
	},

	sound_beep = {
		osc1_oct: 10,
		osc1_det: 0,
		osc1_detune: 0,
		osc1_xenv: 0,
		osc1_vol: 192,
		osc1_waveform: 2,
		osc2_oct: 6,
		osc2_det: 0,
		osc2_detune: 9,
		osc2_xenv: 0,
		osc2_vol: 192,
		osc2_waveform: 1,
		noise_fader: 0,
		env_attack: 137,
		env_sustain: 2000,
		env_release: 4611,
		env_master: 140,
		fx_filter: 1,
		fx_freq: 982,
		fx_resonance: 89,
		fx_delay_time: 6,
		fx_delay_amt: 25,
		fx_pan_freq: 6,
		fx_pan_amt: 77,
		lfo_osc1_freq: 0,
		lfo_fx_freq: 1,
		lfo_freq: 3,
		lfo_amt: 69,
		lfo_waveform: 0
	},

	sound_hurt = {
		osc1_oct: 7,
		osc1_det: 3,
		osc1_detune: 140,
		osc1_xenv: 1,
		osc1_vol: 232,
		osc1_waveform: 3,
		osc2_oct: 6,
		osc2_det: 0,
		osc2_detune: 9,
		osc2_xenv: 0,
		osc2_vol: 30,
		osc2_waveform: 1,
		noise_fader: 17,
		env_attack: 4611,
		env_sustain: 1403,
		env_release: 34215,
		env_master: 256,
		fx_filter: 4,
		fx_freq: 948,
		fx_resonance: 196,
		fx_delay_time: 0,
		fx_delay_amt: 0,
		fx_pan_freq: 0,
		fx_pan_amt: 1,
		lfo_osc1_freq: 0,
		lfo_fx_freq: 1,
		lfo_freq: 13,
		lfo_amt: 255,
		lfo_waveform: 2
	},

	sound_pickup = {
		osc1_oct: 5,
		osc1_det: 0,
		osc1_detune: 0,
		osc1_xenv: 1,
		osc1_vol: 97,
		osc1_waveform: 0,
		osc2_oct: 8,
		osc2_det: 0,
		osc2_detune: 0,
		osc2_xenv: 1,
		osc2_vol: 204,
		osc2_waveform: 0,
		noise_fader: 0,
		env_attack: 4298,
		env_sustain: 927,
		env_release: 1403,
		env_master: 255,
		fx_filter: 2,
		fx_freq: 484,
		fx_resonance: 134,
		fx_delay_time: 3,
		fx_delay_amt: 35,
		fx_pan_freq: 4,
		fx_pan_amt: 72,
		lfo_osc1_freq: 0,
		lfo_fx_freq: 1,
		lfo_freq: 6,
		lfo_amt: 231,
		lfo_waveform: 0
	},

	sound_explode = {	
		osc1_oct: 8,
		osc1_det: 0,
		osc1_detune: 0,
		osc1_xenv: 1,
		osc1_vol: 147,
		osc1_waveform: 1,
		osc2_oct: 6,
		osc2_det: 0,
		osc2_detune: 0,
		osc2_xenv: 1,
		osc2_vol: 159,
		osc2_waveform: 1,
		noise_fader: 255,
		env_attack: 197,
		env_sustain: 1234,
		env_release: 21759,
		env_master: 232,
		fx_filter: 2,
		fx_freq: 1052,
		fx_resonance: 255,
		fx_delay_time: 4,
		fx_delay_amt: 73,
		fx_pan_freq: 3,
		fx_pan_amt: 25,
		lfo_osc1_freq: 0,
		lfo_fx_freq: 0,
		lfo_freq: 0,
		lfo_amt: 0,
		lfo_waveform: 0
	};var audio_ctx = new (window.webkitAudioContext||window.AudioContext)(),
	audio_sfx_shoot,
	audio_sfx_hit,
	audio_sfx_hurt,
	audio_sfx_beep,
	audio_sfx_pickup,
	audio_sfx_terminal,
	audio_sfx_explode;

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
	sonantxr_generate_sound(audio_ctx, sound_explode, 114, function(buffer){
		audio_sfx_explode = buffer;
	});
};

function audio_play(buffer, loop) {
	var source = audio_ctx.createBufferSource();
	source.buffer = buffer;
	source.loop = loop;
	source.connect(audio_ctx.destination);
	source.start();
};
var terminal_text_ident = '&gt; ';
var terminal_text_title = '' +
	'UNDERRUN\n' +
	'__ \n' +
	'CONCEPT, GRAPHICS &AMP; PROGRAMMING:\n' +
	'DOMINIC SZABLEWSKI // PHOBOSLAB.ORG\n' +
	'__ \n' +
	'MUSIC:\n' +
	'ANDREAS LÖSCH // NO-FATE.NET\n' +
	'___ \n' +
	'SYSTEM VERSION: 13.20.18\n' +
	'CPU: PL(R) Q-COATL 7240 @ 12.6 THZ\n' +
	'MEMORY: 108086391056891900 BYTES\n' +
	' \n' +
	'CONNECTING...';

var terminal_text_garbage = 
	'´A1e{∏éI9·NQ≥ÀΩ¸94CîyîR›kÈ¡˙ßT-;ûÅf^˛,¬›A∫Sã€«ÕÕ' +
	'1f@çX8ÎRjßf•ò√ã0êÃcÄ]Î≤moDÇ’ñ‰\\ˇ≠n=(s7É;';

var terminal_text_story = 
	'DATE: SEP. 13, 2718 - 13:32\n' +
	'CRITICAL SOFTWARE FAILURE DETECTED\n' +
	'ANALYZING...\n' +
	'____\n \n' +
	'ERROR CODE: JS13K2018\n' +
	'STATUS: SYSTEMS OFFLINE\n' +
	'DESCRIPTION: BUFFER UNDERRUN DUE TO SATCOM R.U.D.\n' +
	'AFFECTED SYSTEM: FACILITY AUTOMATION\n' +
	'AFFECTED SUBSYSTEMS: AI, RADIATION SHIELDS, POWER MANAGEMENT\n' +
	' \n' +
	'INITIATING RESCUE SYSTEM...\n' +
	'___' +
	'FAILED\n \n' +
	'ATTEMPTING AUTOMATED REBOOT...\n' +
	'___' +
	'FAILED\n' +
	'_ \n \n' +
	'MANUAL REBOOT OF ALL SYSTEMS REQUIRED\n' +
	'_ \n' +
	'USE WASD OR CURSOR KEYS TO MOVE, MOUSE TO SHOOT\n' +
	'CLICK TO INITIATE YOUR DEPLOYMENT\n ';

var terminal_text_outro = 
	'ALL SATELLITE LINKS ONLINE\n' +
	'CONNECTING...___' +
	'CONNECTION ESTABLISHED\n' +
	'RECEIVING TRANSMISSION...___ \n' +
	
	'SENT: SEP. 13, 2018\n' +
	'RCVD: SEP. 13, 2718\n \n' +
	
	'THANKS FOR PLAYING ❤_ \n' +
	'I HAVE PREVIOUSLY BEEN A PROUD SPONSOR OF THE JS13K\n' +
	'COMPETITION SINCE THE VERY FIRST ONE BACK IN 2012.\n' +
	'HOWEVER, THIS YEAR\'S COMPETITION WAS MY FIRST ONE\n' +
	'AS A PARTICIPANT AND IT HAS BEEN TREMENDOUS FUN!\n \n' +
	
	'I WANT TO THANK MY DEAR FRIEND ANDREAS LÖSCH OF\n' +
	'NO-FATE.NET FOR COMPOSING SOME AWESOME MUSIC ON\n' + 
	'SUCH SHORT NOTICE.\n \n' +

	'FURTHER THANKS GO OUT TO THE JS13K STAFF, THE\n' +
	'SONANT-X DEVELOPERS AND ALL OTHER PARTICIPANTS\n' +
	'IN THIS YEAR\'S JS13K. SEE YOU NEXT YEAR!\n \n' +
	'DOMINIC__' +
	'END OF TRANSMISSION';

var terminal_text_buffer = [],
	terminal_state = 0,
	terminal_current_line,
	terminal_line_wait = 100,
	terminal_print_ident = true,
	terminal_timeout_id = 0,
	terminal_hide_timeout = 0;

terminal_text_garbage += terminal_text_garbage + terminal_text_garbage;

function terminal_show() {
	clearTimeout(terminal_hide_timeout);
	a.style.opacity = 1;
	a.style.display = 'block';
}

function terminal_hide() {
	a.style.opacity = 0;
	terminal_hide_timeout = setTimeout(function(){a.style.display = 'none'}, 1000);
}

function terminal_cancel() {
	clearTimeout(terminal_timeout_id);
}

function terminal_prepare_text(text) {
	return text.replace(/_/g, '\n'.repeat(10)).split('\n');
}

function terminal_write_text(lines, callback) {
	if (lines.length) {
		terminal_write_line(lines.shift(), terminal_write_text.bind(this, lines, callback));
	}
	else {
		callback && callback();
	}
}

function terminal_write_line(line, callback) {
	if (terminal_text_buffer.length > 20) {
		terminal_text_buffer.shift();
	}
	if (line) {
		audio_play(audio_sfx_terminal);
		terminal_text_buffer.push((terminal_print_ident ? terminal_text_ident : '') + line);
		a.innerHTML = '<div>'+terminal_text_buffer.join('&nbsp;</div><div>')+'<b>█</b></div>';
	}
	terminal_timeout_id = setTimeout(callback, terminal_line_wait);
}

function terminal_show_notice(notice, callback) {
	a.innerHTML = '';
	terminal_text_buffer = [];

	terminal_cancel();
	terminal_show();
	terminal_write_text(terminal_prepare_text(notice), function(){
		terminal_timeout_id = setTimeout(function(){
			terminal_hide();
			callback && callback();
		}, 2000);
	});
}

function terminal_run_intro(callback) {
	terminal_text_buffer = [];
	terminal_write_text(terminal_prepare_text(terminal_text_title), function(){
		terminal_timeout_id = setTimeout(function(){
			terminal_run_garbage(callback);
		}, 4000);
	});
}

function terminal_run_garbage(callback) {
	terminal_print_ident = false;
	terminal_line_wait = 16;

	var t = terminal_text_garbage,
		length = terminal_text_garbage.length;

	for (var i = 0; i < 64; i++) {
		var s = (_math.random()*length)|0;
		var e = (_math.random()*(length - s))|0;
		t += terminal_text_garbage.substr(s, e) + '\n';
	}
	t += ' \n \n';
	terminal_write_text(terminal_prepare_text(t), function(){
		terminal_timeout_id = setTimeout(function(){
			terminal_run_story(callback);
		}, 1500);
	});
}

function terminal_run_story(callback) {
	terminal_print_ident = true;
	terminal_line_wait = 100;
	terminal_write_text(terminal_prepare_text(terminal_text_story), callback);
}

function terminal_run_outro(callback) {
	c.style.opacity = 0.3;
	a.innerHTML = '';
	terminal_text_buffer = [];

	terminal_cancel();
	terminal_show();
	terminal_write_text(terminal_prepare_text(terminal_text_outro));
}


terminal_write_line('INITIATING...');

audio_init(function(){
	_document.onclick = function() {
		_document.onclick = null;
		terminal_cancel();
		terminal_write_line('INITIATING...', function(){
			renderer_init();
				
			load_image('q2', function() {
				terminal_hide();
				renderer_bind_image(this);
				next_level(game_tick);
			});
			
		});
	};

	terminal_run_intro();
});



import { udef } from './game';

import vertex_shader from './s/vert.glsl';
import fragment_shader from './s/frag.glsl';

var gl = c.getContext('webgl') || c.getContext('experimental-webgl');
var vertex_buffer;
var shader_program;

var texture_size = 1024;
var tile_size = 16;
var tile_fraction = tile_size / texture_size;
var px_nudge = 0.5 / texture_size;

var max_verts = 1024 * 64;
var num_verts = 0;
export function get_num_verts() {
  console.log(num_verts);
  return num_verts;
}
export function set_num_verts(verts) {
  num_verts = verts;
}
var level_num_verts;
export function get_level_num_verts() {
  return level_num_verts;
}
export function set_level_num_verts(verts) {
  level_num_verts = verts;
}

// allow 64k verts, 8 properties per vert
var buffer_data = new Float32Array(max_verts * 8);

var light_uniform;
var max_lights = 32;
var num_lights = 0;
export function get_num_lights() {
  return num_lights;
}
export function set_num_lights(lights) {
  num_lights = lights;
}

// 32 lights, 7 properties per light
var light_data = new Float32Array(max_lights * 7);

var camera_x = 0;
export function get_camera_x() {
  return camera_x;
}
export function set_camera_x(x) {
  camera_x = x;
}

var camera_y = 0;
export function get_camera_y() {
  return camera_y;
}
export function set_camera_y(y) {
  camera_y = y;
}

var camera_z = 0;
export function get_camera_z() {
  return camera_z;
}
export function set_camera_z(z) {
  camera_z = z;
}

var camera_shake = 0;
export function get_camera_shake() {
  return camera_shake;
}
export function set_camera_shake(shake) {
  camera_shake = shake;
}

var camera_uniform;

export function renderer_init() {
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
  gl.attachShader(
    shader_program,
    compile_shader(gl.VERTEX_SHADER, vertex_shader),
  );
  gl.attachShader(
    shader_program,
    compile_shader(gl.FRAGMENT_SHADER, fragment_shader),
  );
  gl.linkProgram(shader_program);
  gl.useProgram(shader_program);

  camera_uniform = gl.getUniformLocation(shader_program, 'cam');
  light_uniform = gl.getUniformLocation(shader_program, 'l');

  gl.enable(gl.DEPTH_TEST);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  gl.viewport(0, 0, c.width, c.height);

  enable_vertex_attrib('p', 3, 8, 0);
  enable_vertex_attrib('uv', 2, 8, 3);
  enable_vertex_attrib('n', 3, 8, 5);
}

export function renderer_bind_image(image) {
  var texture_2d = gl.TEXTURE_2D;
  gl.bindTexture(texture_2d, gl.createTexture());
  gl.texImage2D(texture_2d, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
  gl.texParameteri(texture_2d, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(texture_2d, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(texture_2d, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(texture_2d, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
}

export function renderer_prepare_frame() {
  num_verts = level_num_verts;
  num_lights = 0;

  // reset all lights
  light_data.fill(1);
}

export function renderer_end_frame() {
  gl.uniform3f(camera_uniform, camera_x, camera_y - 10, camera_z - 30);
  gl.uniform1fv(light_uniform, light_data);

  gl.clearColor(0, 0, 0, 1);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  gl.bufferData(gl.ARRAY_BUFFER, buffer_data, gl.DYNAMIC_DRAW);
  gl.drawArrays(gl.TRIANGLES, 0, num_verts);
}

// prettier-ignore
function push_quad(
  x1, y1, z1,
  x2, y2, z2,
  x3, y3, z3,
  x4, y4, z4,
  nx, ny, nz,
  tile,
) {
  var u = tile * tile_fraction + px_nudge;
  buffer_data.set(
    // prettier-ignore
    [
      x1, y1, z1, u, 0, nx, ny, nz,
      x2, y2, z2, u + tile_fraction - px_nudge, 0, nx, ny, nz,
      x3, y3, z3, u, 1, nx, ny, nz,
      x2, y2, z2, u + tile_fraction - px_nudge, 0, nx, ny, nz,
      x3, y3, z3, u, 1, nx, ny, nz,
      x4, y4, z4, u + tile_fraction - px_nudge, 1, nx, ny, nz
    ],
    num_verts * 8,
  );
  num_verts += 6;
}

export function push_sprite(x, y, z, tile) {
  // tilt sprite when closer to camera
  var tilt = 3 + (camera_z + z) / 12;

  // prettier-ignore
  push_quad(
    x, y + 6, z,
    x + 6, y + 6, z,
    x, y, z + tilt,
    x + 6, y, z + tilt,
    0, 0, 1,
    tile,
  );
}

export function push_floor(x, z, tile) {
  push_quad(x, 0, z, x + 8, 0, z, x, 0, z + 8, x + 8, 0, z + 8, 0, 1, 0, tile);
}

export function push_block(x, z, tile_top, tile_sites) {
  // tall blocks for certain tiles
  var y = ~[8, 9, 17].indexOf(tile_sites) ? 16 : 8;

  // prettier-ignore
  push_quad(
    x, y, z,
    x + 8, y, z,
    x, y, z + 8,
    x + 8, y, z + 8,
    0, 1, 0,
    tile_top,
  ); // top

  // prettier-ignore
  push_quad(
    x + 8, y, z,
    x + 8, y, z + 8,
    x + 8, 0, z,
    x + 8, 0, z + 8,
    1, 0, 0,
    tile_sites,
  ); // right

  // prettier-ignore
  push_quad(
    x, y, z + 8,
    x + 8, y, z + 8,
    x, 0, z + 8,
    x + 8, 0, z + 8,
    0, 0, 1,
    tile_sites,
  ); // front

  // prettier-ignore
  push_quad(
    x, y, z,
    x, y, z + 8,
    x, 0, z,
    x, 0, z + 8,
    -1, 0, 0,
    tile_sites,
  ); // left
}

export function push_light(x, y, z, r, g, b, falloff) {
  if (num_lights < max_lights) {
    light_data.set([x, y, z, r, g, b, falloff], num_lights * 7);
    num_lights++;
  }
}

function compile_shader(shader_type, shader_source) {
  var shader = gl.createShader(shader_type);
  gl.shaderSource(shader, shader_source);
  gl.compileShader(shader);
  // console.log(gl.getShaderInfoLog(shader));
  return shader;
}

function enable_vertex_attrib(attrib_name, count, vertex_size, offset) {
  var location = gl.getAttribLocation(shader_program, attrib_name);
  gl.enableVertexAttribArray(location);
  gl.vertexAttribPointer(
    location,
    count,
    gl.FLOAT,
    false,
    vertex_size * 4,
    offset * 4,
  );
}

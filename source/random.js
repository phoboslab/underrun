var rand_high;
var rand_low;

export function random_int(min, max) {
  rand_high = ((rand_high << 16) + (rand_high >> 16) + rand_low) & 0xffffffff;
  rand_low = (rand_low + rand_high) & 0xffffffff;
  var n = (rand_high >>> 0) / 0xffffffff;
  return (min + n * (max - min + 1)) | 0;
}

export function random_seed(seed) {
  rand_high = seed || 0xbadc0ffe;
  rand_low = seed ^ 0x49616e42;
}

export function array_rand(array) {
  return array[random_int(0, array.length - 1)];
}

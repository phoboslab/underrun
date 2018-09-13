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


var ctx_c1 = document.getElementById('statistics_chart').getContext('2d');
var chart1 = new Chart(ctx_c1, {
    type: 'line',
    data: {
        labels: ['Days'],
        datasets: [{
            label: 'Active',
            borderColor: '#e91e63'
        },
        {
            label: 'Recovered',
            borderColor: '#3f51b5'
        },
        {
            label: 'Dead',
            borderColor: 'gray'
        }]
    }
});


var ctx_c2 = document.getElementById('statistics_chart_inc').getContext('2d');
var chart2 = new Chart(ctx_c2, {
    type: 'line',
    data: {
        labels: ['Days'],
        datasets: [{
            label: 'Incubation Time',
            borderColor: '#e91e63'
        }]
    }
});


function addData(label, infected, recovered, dead) {
    chart1.data.labels.push(label);
    chart1.data.datasets[0].data.push(infected);
    chart1.data.datasets[1].data.push(recovered);
    chart1.data.datasets[2].data.push(dead);
    chart1.update();
}



//var map = new Image();
//map.src = "res/switzerland_patched.svg";


// Canvas
const CANVAS_WIDTH = 3489.3 / 1;
const CANVAS_HEIGHT = 2207.16 / 1;
const DOT_SIZE = 1;

// Population
const POPULATION_FACTOR = 1.5;
const INFECT_AFTER_TIME = 10;

// Desease
const TICKS_IN_A_DAY = 5;
//const INCUBATION_TIME = 5;
const MINIMUM_DISTANCE = 0.2;
const DESEASE_DURATION = 19;
const DEATH_RATE = 0.035;

const MINIMUM_DISTANCE_POW = Math.pow(MINIMUM_DISTANCE, 2);
const DESEASE_DURATION_TICKS = DESEASE_DURATION * TICKS_IN_A_DAY;
//const INCUBATION_TICKS = INCUBATION_TIME * TICKS_IN_A_DAY;


const STATUS = {
	HEALTHY: 0,
	INCUBATING: 1,
	INFECTED: 2,
	IMUNE: 3,
	DEAD: 4
};


var tick_cnt = 0;
var iterval_id;
var imune_cnt = 0;
var dead_cnt = 0;


var off = document.createElement('canvas');
off.width = CANVAS_WIDTH;
off.height = CANVAS_HEIGHT;
var ctx = off.getContext('2d');  


var mapsvg = document.getElementById("map-svg");
mapsvg.width = CANVAS_WIDTH;
mapsvg.height = CANVAS_HEIGHT;

var canvas = document.getElementById("sim_canvas");
canvas.width = CANVAS_WIDTH;
canvas.height = CANVAS_HEIGHT;
var ctx_screen = canvas.getContext("2d");

var pers = {
	x: 0,
	y: 0,
	dx: 0,
	dy: 0,
	stat: 0,

	gender: false,
	age: -1,
	reach: -1,

	home_x: 0,
	home_y: 0,


	infection_tick: -1,
	incubation_tick: -1,
	infected_cnt: 0,
};

var persons = [];
var infection_starter = [];

function init()
{
	let incubationMap = {};
	for (var i = 0; i < 15; ++i) {
		incubationMap[i] = 0;
	}

	//var map_object = document.getElementById("svg-object");
	//var map_doc = (map_object.contentWindow || map_object.contentDocument);
	var all_paths = document.querySelectorAll("path");

	for (var o = 0; o < all_paths.length; ++o) {

		var center_x = all_paths[o].getBBox().x + (all_paths[o].getBBox().width / 2);
		var center_y = all_paths[o].getBBox().y + (all_paths[o].getBBox().height / 2);

		for (var i = 0; i < Math.pow(parseInt(all_paths[o].getAttribute('data-pop')), 1 / POPULATION_FACTOR) ; ++i) {
			var item = {...pers };
			item.x = center_x + (Math.random()*2-1);
			item.y = center_y + (Math.random()*2-1);

			item.home_x = item.x;
			item.home_y = item.y;

			item.gender = Math.floor(Math.random()*2);
			item.age = randn_bm(0, 100, 42);
			item.reach = randn_bm(0, 100, 5);
			let incubationtime = Math.round(randn_bm(1, 14, 1.6));
			item.incubation_tick = incubationtime * TICKS_IN_A_DAY;

			incubationMap[incubationtime] += 1;


			persons.push(item);

			let title = all_paths[o].getAttribute('data-title');
			if(i == 0 &&
			 ((title == "Bellinzona") ||
			 (title == "Zürich") ||
			 (title == "Lausanne")))
			{
				infection_starter.push(item);
			}
		}

	}

	chart2.data.labels = (Object.keys(incubationMap));
    chart2.data.datasets[0].data = (Object.values(incubationMap));
    chart2.update();

	console.log("Total Population: ", persons.length);
}

function tick()
{
	let boundary = new Rectangle(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
	let qtree = new QuadTree(boundary, 10);

	for (var i = 0; i < persons.length; ++i) {
		if(persons[i].stat == STATUS.DEAD) continue;

		


		var x = Math.random() * 2 - 1;
		var y = Math.random() * 2 - 1;
		var norm = Math.sqrt(x * x + y * y);

		if (norm != 0) {
			x = persons[i].reach * x / norm;
			y = persons[i].reach * y / norm;
		}

		persons[i].dx = persons[i].dx * 0.5 + x * 0.5 + (persons[i].home_x - persons[i].x) * 0.02;
		persons[i].dy = persons[i].dy * 0.5 + y * 0.5 + (persons[i].home_y - persons[i].y) * 0.02;

		persons[i].x += persons[i].dx;
		persons[i].y += persons[i].dy;

		if(persons[i].stat == STATUS.HEALTHY){					
			let point = new Point(persons[i].x, persons[i].y, persons[i]);
			qtree.insert(point);
		}


		//map.getImageData(persons[i].x, persons[i].y, 1, 1).data; 

	}

	var infected_count = 0;
	var r0 = 0;

	for (var i = 0; i < persons.length; ++i) {
		if(persons[i].stat == STATUS.INFECTED) {
			if(persons[i].infection_tick + DESEASE_DURATION_TICKS < tick_cnt)
			{
				if(Math.random() < DEATH_RATE){
					persons[i].stat = STATUS.DEAD;
					++dead_cnt;
				}else{
					persons[i].stat = STATUS.IMUNE;
					++imune_cnt;
				}
				continue;
			}

			++infected_count;


			let range = new Circle(persons[i].x, persons[i].y, MINIMUM_DISTANCE);
			let points = qtree.query(range);
			for (let point of points) {
				let other = point.userData;
			
			//for (var j = 0; j < persons.length; ++j) {
				//if(i == j || persons[j].stat != STATUS.HEALTHY) continue;

				//var dist = Math.pow(persons[i].x - persons[j].x, 2) + Math.pow(persons[i].y - persons[j].y, 2);
				//if(dist <= MINIMUM_DISTANCE_POW)
				//{
					persons[i].infected_cnt += 1;

					other.stat = STATUS.INCUBATING;
					other.infection_tick = tick_cnt;
				//}

			}


			r0 += persons[i].infected_cnt;

		}else if(persons[i].stat == STATUS.INCUBATING) {
			if(tick_cnt > persons[i].infection_tick + persons[i].incubation_tick) {
				persons[i].stat = STATUS.INFECTED;
			}
		}
	}

	r0 /= infected_count;

	if(tick_cnt % TICKS_IN_A_DAY == 0){
		console.log("Day:", tick_cnt / TICKS_IN_A_DAY, "\tInfections:", infected_count, "\tR0: ", r0);

		addData(tick_cnt / TICKS_IN_A_DAY, infected_count, imune_cnt, dead_cnt);
	}

	++tick_cnt;

	if(tick_cnt == INFECT_AFTER_TIME) {
		for(let p of infection_starter)
		{
			p.stat = STATUS.INFECTED;
		}
	}
	if(tick_cnt > INFECT_AFTER_TIME && infected_count == 0) clearInterval(iterval_id);
}


function render()
{
	var incubating = [];
	var infected = [];
	var imunes = [];
	var dead = [];

	ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
	ctx_screen.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

	//ctx.drawImage(map, 0, 0);

	ctx.fillStyle = "#4caf50";
	for (var i = 0; i < persons.length; ++i) {
		if(persons[i].stat == STATUS.INCUBATING){
			incubating.push(persons[i]);
			continue;
		}else if(persons[i].stat == STATUS.INFECTED){
			infected.push(persons[i]);
			continue;
		}else if(persons[i].stat == STATUS.IMUNE){
			imunes.push(persons[i]);
			continue;
		}else if(persons[i].stat == STATUS.DEAD){
			dead.push(persons[i]);
			continue;
		}
		

		ctx.fillRect(persons[i].x, persons[i].y, DOT_SIZE, DOT_SIZE);
	}
	
	// Incubating
	ctx.fillStyle = "#e9a91e";
	for (var i = 0; i < incubating.length; ++i) {
		ctx.fillRect(incubating[i].x, incubating[i].y, DOT_SIZE, DOT_SIZE);
	}

	// Infected
	ctx.fillStyle = "#e91e63";
	for (var i = 0; i < infected.length; ++i) {
		ctx.fillRect(infected[i].x, infected[i].y, DOT_SIZE, DOT_SIZE);
	}


	// Imune
	ctx.fillStyle = "#3f51b5";
	for (var i = 0; i < imunes.length; ++i) {
		ctx.fillRect(imunes[i].x, imunes[i].y, DOT_SIZE, DOT_SIZE);
	}


	// Dead
	ctx.fillStyle = "gray";
	for (var i = 0; i < dead.length; ++i) {
		ctx.fillRect(dead[i].x, dead[i].y, DOT_SIZE, DOT_SIZE);
	}


	ctx_screen.drawImage(off, 0, 0);
	
}



function randn_bm(min, max, skew) {
    let u = 0, v = 0;
    while(u === 0) u = Math.random(); //Converting [0,1) to (0,1)
    while(v === 0) v = Math.random();
    let num = Math.sqrt( -2.0 * Math.log( u ) ) * Math.cos( 2.0 * Math.PI * v );

    num = num / 10.0 + 0.5; // Translate to 0 -> 1
    if (num > 1 || num < 0) num = randn_bm(min, max, skew); // resample between 0 and 1 if out of range
    num = Math.pow(num, skew); // Skew
    num *= max - min; // Stretch to fill range
    num += min; // offset to min
    return num;
}

function stop()
{
	clearInterval(iterval_id);
}


document.addEventListener("DOMContentLoaded", function(event) {
	init();

	/*
	tick();
	render();	
	tick();
	render();	
	*/
	
	iterval_id = setInterval(function() {
		tick();
		render();				
	}, 100);
	
	
});
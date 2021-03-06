var ctx_c1 = document.getElementById('statistics_all_chart').getContext('2d');
var chart1 = new Chart(ctx_c1, {
    type: 'line',
    data: {
        labels: ['Days'],
        datasets: [{
            label: 'Active',
            borderColor: '#e91e63'
        },
        {
            label: 'Total',
            borderColor: 'red'
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

var chart_daily_ctx = document.getElementById('statistics_daily_chart').getContext('2d');
var chart_daily = new Chart(chart_daily_ctx, {
    type: 'bar',
    data: {
        labels: ['Days'],
        datasets: [{
            label: 'Cases',
            backgroundColor: 'gray'
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


function addDailyInfected(label, amount)
{
	chart_daily.data.labels.push(label);
    chart_daily.data.datasets[0].data.push(amount);
    chart_daily.update();
}

function addData(label, infected, total, recovered, dead) {
    chart1.data.labels.push(label);
    chart1.data.datasets[0].data.push(infected);
    chart1.data.datasets[1].data.push(total);
    chart1.data.datasets[2].data.push(recovered);
    chart1.data.datasets[3].data.push(dead);
    chart1.update();
}




const STATUS = {
	HEALTHY: 0,
	INCUBATING: 1,
	INFECTED: 2,
	IMUNE: 3,
	DEAD: 4
};

const DAY_CYCLE = {
	MORNING_WORK: 		{id: 0, name: "Morning Work"},
	LUNCH: 				{id: 1, name: "Lunch"},
	AFTERNOON_WORK:		{id: 2, name: "Afternoon Work"},
	AFTERNOON_ACTIVITY:	{id: 3, name: "Afternoon Activity"},
	HOME: 				{id: 4, name: "Home"},
}



// Canvas
const CANVAS_WIDTH = 3489.3 / 1;
const CANVAS_HEIGHT = 2207.16 / 1;
const DOT_SIZE = 1;

// Population
var POPULATION_FACTOR = 0.3;
const INFECT_AFTER_TIME = 10;

// Desease
var MINIMUM_DISTANCE = 0.05;
const DESEASE_DURATION = 19;
const DEATH_RATE = 0.035;



const TICKS_IN_A_DAY = Object.keys(DAY_CYCLE).length;
const DESEASE_DURATION_TICKS = DESEASE_DURATION * TICKS_IN_A_DAY;

var is_simulating = false;
var is_initialized = false;
var tick_cnt = 0;
var cycle;
var iterval_id;
var total_infected_count = 0;
var imune_cnt = 0;
var dead_cnt = 0;
var daily_total_infected_count = 0;

// Measures
var stay_home_measure = false;


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

var person = {
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

var big_places = {};
var persons = [];
var infection_starter = [];


var play_pause_btn;
var stop_btn;
var stay_home_btn;
var svg_point;

var day_display;
var cycle_display;
var population_display;
var infected_display;
var recovered_display;
var dead_display;


function init_elements()
{

	play_pause_btn 	= document.getElementById('play-pause-btn');
	stop_btn 		= document.getElementById('stop-btn');

	stay_home_btn 		= document.getElementById('stay-home-btn');

	day_display			= document.getElementById('day_display');
	cycle_display		= document.getElementById('cycle_display');
	population_display	= document.getElementById('population_display');
	infected_display	= document.getElementById('infected_display');
	recovered_display	= document.getElementById('recovered_display');
	dead_display		= document.getElementById('dead_display');

	svg_point = mapsvg.createSVGPoint();


	play_pause_btn.addEventListener("click", start);
	stop_btn.addEventListener("click", stop);

	stay_home_btn.addEventListener("click", toggle_stay_home_measure);
}


function init()
{
	POPULATION_FACTOR = parseFloat(document.getElementById('population_factor_input').value);
	MINIMUM_DISTANCE = parseFloat(document.getElementById('minimum_distance_input').value);


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

		for (var i = 0; i < (parseInt(all_paths[o].getAttribute('data-pop')) * POPULATION_FACTOR) ; ++i) {
			var item = {...person };

			do{
				item.x = randn_bm(center_x -all_paths[o].getBBox().width/2, center_x + all_paths[o].getBBox().width/2, 1);
				item.y = randn_bm(center_y -all_paths[o].getBBox().height/2, center_y + all_paths[o].getBBox().height/2, 1);

				svg_point.x = item.x;
				svg_point.y = item.y;

			}while(!all_paths[o].isPointInFill(svg_point))

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



			if(i == 0 &&
			 (
			 	(title == "Bellinzona") ||
				 (title == "Zürich") ||
				 (title == "Lausanne") ||
				 (title == "Basel") ||
				 (title == "Bern") ||
				 (title == "Luzern") ||
				 (title == "Zürich") ||
				 (title == "Genève")
			 ))
			{
				big_places[title] = {x: center_x, y: center_y};
			}
		}

	}

	chart2.data.labels = (Object.keys(incubationMap));
    chart2.data.datasets[0].data = (Object.values(incubationMap));
    chart2.update();

    is_initialized = true;
}

function tick()
{
	cycle = DAY_CYCLE[Object.keys(DAY_CYCLE)[(tick_cnt-1) % TICKS_IN_A_DAY]]

	let boundary = new Rectangle(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
	let qtree = new QuadTree(boundary, 10);

	// Simulate movement
	for (var i = 0; i < persons.length; ++i) {
		if(persons[i].stat == STATUS.DEAD) continue;

		var x = Math.random() * 2 - 1;
		var y = Math.random() * 2 - 1;
		var norm = Math.sqrt(x * x + y * y);

		if (norm != 0) {
			x = persons[i].reach * x / norm;
			y = persons[i].reach * y / norm;
		}

		// Short city trip
		persons[i].dx = persons[i].dx * 0.5 + x * 0.5 + (persons[i].home_x - persons[i].x) * 0.02;
		persons[i].dy = persons[i].dy * 0.5 + y * 0.5 + (persons[i].home_y - persons[i].y) * 0.02;

		if(cycle == DAY_CYCLE.HOME || (stay_home_measure && Math.random() <= 0.9)){
			// Go Home
			persons[i].x = persons[i].home_x;
			persons[i].y = persons[i].home_y;

			persons[i].dx = 0;
			persons[i].dy = 0;

		}else if(cycle == DAY_CYCLE.MORNING_WORK){
			// Go to a popular city
			if(Math.random() <= 0.05){
				let index = Math.floor(Math.random() * Object.keys(big_places).length);
				let key = Object.keys(big_places)[index];
				let el = big_places[key];
				persons[i].x = el.x;
				persons[i].y = el.y;
			}
		}

		persons[i].x += persons[i].dx;
		persons[i].y += persons[i].dy;

		if(persons[i].stat == STATUS.HEALTHY){					
			let point = new Point(persons[i].x, persons[i].y, persons[i]);
			qtree.insert(point);
		}
	}

	var infected_count = 0;
	var r0 = 0;

	// Simulate infections
	for (var i = 0; i < persons.length; ++i) {
		if(persons[i].stat == STATUS.INFECTED || persons[i].stat == STATUS.INCUBATING) {
			if(persons[i].infection_tick + persons[i].incubation_tick + DESEASE_DURATION_TICKS < tick_cnt)
			{
				if(Math.random() <= DEATH_RATE){
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

				if(other.stat == STATUS.INCUBATING || other.stat == STATUS.INFECTED) continue;
			
			//for (var j = 0; j < persons.length; ++j) {
				//if(i == j || persons[j].stat != STATUS.HEALTHY) continue;

				//var dist = Math.pow(persons[i].x - persons[j].x, 2) + Math.pow(persons[i].y - persons[j].y, 2);
				//if(dist <= MINIMUM_DISTANCE_POW)
				//{
					let chance;
					if(persons[i].stat == STATUS.INCUBATING){
						chance = 0.3;
					}else if(persons[i].stat == STATUS.INFECTED){
						chance = 0.9;
					}

					if(Math.random() <= chance){
						persons[i].infected_cnt += 1;
						++total_infected_count;
						++daily_total_infected_count;						

						other.stat = STATUS.INCUBATING;
						other.infection_tick = tick_cnt;
					}
				//}
			}

			r0 += persons[i].infected_cnt;

			// Escalate incubating patients to infected
			if(persons[i].stat == STATUS.INCUBATING) {
				if(tick_cnt > persons[i].infection_tick + persons[i].incubation_tick) {
					persons[i].stat = STATUS.INFECTED;
				}
			}
		}
	}

	r0 /= infected_count;

	if(tick_cnt % TICKS_IN_A_DAY == 0){
		addDailyInfected(tick_cnt / TICKS_IN_A_DAY, daily_total_infected_count);
		addData(tick_cnt / TICKS_IN_A_DAY, infected_count, total_infected_count, imune_cnt, dead_cnt);

		daily_total_infected_count = 0;
	}

	++tick_cnt;

	// Start infections
	if(tick_cnt == INFECT_AFTER_TIME) {
		for(let p of infection_starter)
		{
			p.stat = STATUS.INCUBATING;
			++total_infected_count;
			++daily_total_infected_count;
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

	ctx.fillStyle = "gray";
	ctx.strokeStyle = "gray";
	ctx.lineWidth = 1;
	
	var scalar = 100;
	var small_cross = 5;
	var big_cross = 18;

	for (var i = 0; i < CANVAS_WIDTH / scalar; ++i){
		for (var j = 0; j < CANVAS_HEIGHT / scalar; ++j){
			let linear = (i % 5 == 0 && j % 5 == 0) ? big_cross : small_cross;
			ctx.beginPath();
			ctx.moveTo(i*scalar - linear, j*scalar);
			ctx.lineTo(i*scalar + linear, j*scalar);
			ctx.moveTo(i*scalar, j*scalar - linear);
			ctx.lineTo(i*scalar, j*scalar + linear);
			ctx.stroke();
			if(i % 5 == 0 && j % 5 == 0) ctx.fillText(i * scalar + ", " + j * scalar, i*scalar + 4, j*scalar+ 12);
		}		
	}

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

function toggle_stay_home_measure()
{
	stay_home_measure = !stay_home_measure;
}


function update_elements()
{
	day_display.textContent 		= Math.floor(tick_cnt / TICKS_IN_A_DAY);
	cycle_display.textContent 		= cycle.name;
	population_display.textContent	= persons.length;
	infected_display.textContent	= total_infected_count;
	recovered_display.textContent	= imune_cnt;
	dead_display.textContent		= dead_cnt;
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

function start()
{
	if(!is_simulating){
		if(!is_initialized) init();
		resume();
		play_pause_btn.textContent = "Pause";
	}else{
		stop();
		play_pause_btn.textContent = "Resume";
	}
}

function resume()
{
	iterval_id = setInterval(function() {
		tick();
		update_elements();
		render();
	}, 100);
	is_simulating = true;
}

function stop()
{
	clearInterval(iterval_id);
	is_simulating = false;
}



document.addEventListener("DOMContentLoaded", function(event) {
	init_elements();
});
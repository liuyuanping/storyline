// Request the data
// d3.json('data.json', function(err, response){

let narrative_init = function(narrative_data) {

	var narrative, svg, scenes, charactersMap, width, height,
		sceneWidth, pathSpace, scale, orientation;

	// Get the data in the format we need to feed to d3.layout.narrative().scenes
	scenes = wrangle(narrative_data);
	// console.log(scenes);

	// Some defaults
	sceneWidth = 10;
	pathSpace = 10;
	scale = 4;
	labelSize = [50, 15];
	width = Math.max(scenes.length * sceneWidth * scale, 800) + labelSize[0];
	height = Math.max(scenes.length * sceneWidth * scale, 600) + labelSize[1];
	orientation = 'horizontal';

	// The container element (this is the HTML fragment);
	svg = d3.select("#container").append('svg')
		.attr('id', 'narrative-chart')
		.attr('width', width)
		.attr('height', height);

	// Calculate the actual width of every character label.
	scenes.forEach(function (scene) {
		scene.characters.forEach(function (character) {
			character.width = svg.append('text')
				.attr('opacity', 0)
				.attr('class', 'temp')
				.text(character.name)
				.node().getComputedTextLength() + 10;
		});
	});

	// Remove all the temporary labels.
	svg.selectAll('text.temp').remove();

	// Do the layout
	narrative = d3.layout.narrative()
		.scenes(scenes)
		.size([width, height])
		.pathSpace(pathSpace)
		.groupMargin(10)
		.labelSize(labelSize)
		.scenePadding([5, sceneWidth / 2, 5, sceneWidth / 2])
		.labelPosition(orientation === 'vertical' ? 'right' : 'left')
		.orientation(orientation)
		.layout();

	// Get the extent so we can re-size the SVG appropriately.
	svg.attr('height', narrative.extent()[1]);

	// Draw the scenes
	svg.selectAll('.scene').data(narrative.scenes()).enter()
		.append('g').attr('class', 'scene')
		.attr('transform', function (d) {
			var x, y;
			x = Math.round(d.x) + 0.5;
			y = Math.round(d.y) + 0.5;
			return 'translate(' + [x, y] + ')';
		})
		.append('rect')
		.attr('width', orientation === 'vertical' ? function (d) { return d.height; } : sceneWidth)
		.attr('height', orientation === 'vertical' ? sceneWidth : function (d) { return d.height; })
		.attr('opacity', function (d) { return d.opacity; })
		.attr('y', 0)
		.attr('x', 0)
		.attr('rx', 3)
		.attr('ry', 3)
		.style("pointer-events","visible")
		.on('click', function (d, i) {
			reduce_opacity();
			improve_scene_opacity(d);
			d.characters.forEach(function (character) {
				improve_character_opacity(character);
			});
			d3.selectAll('#narrative-chart').remove();
			narrative_init(narrative_data);
			set_scene_info(d.toString());
		})
		.on('dblclick', function (d, i) {
			improve_opacity();
			d3.selectAll('#narrative-chart').remove();
			narrative_init(narrative_data);
		})
		.on('mouseover', function (d, i) {
			d3.select(this)
				.attr('opacity', high_opacity)
				.style('fill', 'skyblue');
			set_tooltip(d.toStringShort(), d3.event.pageX, d3.event.pageY);
		})
		.on('mouseout', function (d, i) {
			d3.select(this)
				.attr('opacity', d.opacity)
				.style('fill', null);
		});

	// Draw appearances
	svg.selectAll('.scene').selectAll('.appearance').data(function (d) {
		return d.appearances;
	}).enter().append('circle')
		.attr('cx', function (d) { return d.x; })
		.attr('cy', function (d) { return d.y; })
		.attr('r', 2)
		.attr('class', function (d) {
			return 'appearance ' + d.character.affiliation.toLowerCase();
		})
		.attr('opacity', function (d) { return d.character.opacity; })
		.on('click', function (d, i) {
			reduce_opacity();
			improve_character_opacity(d.character);
			d3.selectAll('#narrative-chart').remove();
			narrative_init(narrative_data);
			set_character_info(d.character.toString());
		})
		.on('mouseover', function (d, i) {
			d3.select(this)
				.attr('opacity', high_opacity)
				.attr('r', 4);
			set_tooltip(d.character.toStringShort(), d3.event.pageX, d3.event.pageY);
		})
		.on('mouseout', function (d, i) {
			d3.select(this)
				.attr('opacity', d.character.opacity)
				.attr('r', 2);
		});

	// Draw links
	svg.selectAll('.link').data(narrative.links()).enter()
		.append('path')
		.attr('class', function (d) {
			return 'link ' + d.character.affiliation.toLowerCase();
		})
		.attr('opacity', function (d) { return d.character.opacity; })
		.attr('d', narrative.link())
		.on('click', function (d, i) {
			reduce_opacity();
			improve_character_opacity(d.character);
			d3.selectAll('#narrative-chart').remove();
			narrative_init(narrative_data);
			set_character_info(d.character.toString());
		})
		.on('mouseover', function (d, i) {
			d3.select(this)
				.attr('opacity', high_opacity)
				.style('stroke-width', 3);
			set_tooltip(d.character.toStringShort(), d3.event.pageX, d3.event.pageY);
		})
		.on('mouseout', function (d, i) {
			d3.select(this)
				.attr('opacity', d.character.opacity)
				.style('stroke-width', null);
		});

	// Draw intro nodes
	svg.selectAll('.intro').data(narrative.introductions())
		.enter().call(function (s) {
		var g, text;

		g = s.append('g').attr('class', 'intro');

		g.append('rect')
			.attr('y', -4)
			.attr('x', -4)
			.attr('width', 4)
			.attr('height', 8);

		text = g.append('g').attr('class', 'text');

		// Apppend two actual 'text' nodes to fake an 'outside' outline.
		text.append('text');
		text.append('text').attr('class', 'color');

		g.attr('transform', function (d) {
			var x, y;
			x = Math.round(d.x);
			y = Math.round(d.y);
			return 'translate(' + [x, y] + ')';
		});

		g.selectAll('text')
			.attr('text-anchor', 'end')
			.attr('y', '4px')
			.attr('x', '-8px')
			.attr('opacity', function (d) { return d.character.opacity; })
			.text(function (d) { return d.character.name; })
			.style("pointer-events","visible")
			.on('click', function (d, i) {
				reduce_opacity();
				improve_character_opacity(d.character);
				d3.selectAll('#narrative-chart').remove();
				narrative_init(narrative_data);
				set_character_info(d.character.toString());
			})
			.on('mouseover', function (d, i) {
				d3.select(this)
					.attr('opacity', high_opacity)
					.style('font-size', '15px');
				set_tooltip(d.character.toStringShort(), d3.event.pageX, d3.event.pageY);
			})
			.on('mouseout', function (d, i) {
				d3.select(this)
					.attr('opacity', d.character.opacity)
					.style('font-size', '12px');
			});

		g.select('.color')
			.attr('class', function (d) {
				return 'color ' + d.character.affiliation.toLowerCase();
			});

		g.select('rect')
			.attr('class', function (d) {
				return d.character.affiliation.toLowerCase();
			})
			.attr('opacity', function (d) { return d.character.opacity; })
			.style("pointer-events","visible")
			.on('click', function (d, i) {
				reduce_opacity();
				improve_character_opacity(d.character);
				d3.selectAll('#narrative-chart').remove();
				narrative_init(narrative_data);
				set_character_info(d.character.toString());
			})
			.on('mouseover', function (d, i) {
				d3.select(this)
					.style('fill', 'skyblue')
					.attr('opacity', high_opacity);
				set_tooltip(d.character.toStringShort(), d3.event.pageX, d3.event.pageY);
			})
			.on('mouseout', function (d, i) {
				d3.select(this)
					.style('fill', null)
					.attr('opacity', d.character.opacity);
			});

	});

	return narrative;
};
// });


function wrangle(data) {

	var charactersMap = {};

	data.characters.forEach(function (character) {
		character.toString = function() {
			return '角色名: ' + character.name
				+ '<br>标识: ' + character.id
				+ '<br>类别: ' + character.affiliation
				+ '<br>描述: ' + character.description
				+ '';
		};
		character.toStringShort = function() {
			return '角色名: ' + character.name
				+ '<br>标识: ' + character.id
				+ '<br>类别: ' + character.affiliation
				// + '<br>描述: ' + character.description
				+ '';
		};
	});

	return data.scenes.map(function(scene){
		var new_scene = {
			id: scene.id || '',
			title: scene.title || '',
			characters: scene.characters
				.map(function(id){ return characterById(id); })
				.filter(function(d) { return (d); }),
			time: scene.time || '',
			place: scene.place || '',
			description: scene.description || '',
			opacity: scene.opacity || high_opacity,
			order: scene.order || -1
		};
		new_scene.toString = function() {
			return '标题: ' + new_scene.title
				+ '<br>标识: ' + new_scene.id
				+ '<br>时间: ' + new_scene.time
				+ '<br>地点: ' + new_scene.place
				+ '<br>排序: ' + new_scene.order
				+ '<br>描述: ' + new_scene.description
				// + ', characters: ' + new_scene.characters
				+ '';
		}
		new_scene.toStringShort = function() {
			return '标题: ' + new_scene.title
				+ '<br>标识: ' + new_scene.id
				+ '<br>时间: ' + new_scene.time
				+ '<br>地点: ' + new_scene.place
				+ '<br>排序: ' + new_scene.order
				// + '<br>描述: ' + new_scene.description
				// + ', characters: ' + new_scene.characters
				+ '';
		}
		return new_scene;
	});

	// Helper to get characters by ID from the raw data
	function characterById(id) {
		charactersMap = charactersMap || {};
		charactersMap[id] = charactersMap[id] || data.characters.find(function(character){
			return character.id === id;
		});
		return charactersMap[id];
	}

}

var low_opacity = 0.2;
var high_opacity = 1
var reduce_opacity = function() {
	narrative_data.scenes.forEach(function (scene) {
		scene.opacity = low_opacity;
	});
	narrative_data.characters.forEach(function (character) {
		character.opacity = low_opacity;
	});
}
var improve_opacity = function() {
	narrative_data.scenes.forEach(function (scene) {
		scene.opacity = high_opacity;
	});
	narrative_data.characters.forEach(function (character) {
		character.opacity = high_opacity;
	});
}
var improve_scene_opacity = function (scene) {
	narrative_data.scenes.forEach(function (ns) {
		if (ns.id === scene.id) {
			ns.opacity = high_opacity;
		}
	});
}
var improve_character_opacity = function (character) {
	narrative_data.characters.forEach(function (nc) {
		if (nc.id === character.id) {
			nc.opacity = high_opacity;
		}
	});
}

// var hide_tooltip_timeout = 10000;
var tooltip_display = true;
var tooltip = d3.select('body').append('div')
					.attr('class', 'tooltip')
					.style('opacity', 0.0);
var hide_tooltip = function () {
	tooltip.html('')
		.style('left', '0px')
		.style('top', '0px')
		.style('opacity', 0.0);
};
var set_tooltip = function (msg, x, y) {
	if (!tooltip_display) {
		return;
	}
	tooltip.html(msg)
		.style('left', (x + 20) + 'px')
		.style('top', (y + 40) + 'px')
		.style('opacity', 0.9)
		.style('z-index', 2);
};
tooltip.on('dblclick', hide_tooltip);


var dragged = function (d) {
	character_info.style('z-index', 0);
	scene_info.style('z-index', 0);
	var dragged_obj = d3.select(this);
	dragged_obj.style('left', 
		(parseInt(dragged_obj.style('left').slice(0, -2)) + d3.event.sourceEvent.movementX) + 'px');
	dragged_obj.style('top', 
		(parseInt(dragged_obj.style('top').slice(0, -2)) + d3.event.sourceEvent.movementY) + 'px');
	dragged_obj.style('z-index', 1);
};
var character_info_title = '<h2>人物</h2>';
var character_info = d3.select('body').append('div')
					.attr('class', 'character_info')
					.style('opacity', high_opacity)
					.html(character_info_title)
					.on('dblclick', function(d) {
						d3.select(this).style('opacity', high_opacity)
							.style('left', null)
							.style('top', null);
					})
					.call(d3.behavior.drag()
						.on('drag', dragged)
					);
var set_character_info = function (msg) {
	character_info.html(character_info_title + msg)
		.style('opacity', high_opacity);
};
var scene_info_title = '<h2>事件</h2>';
var scene_info = d3.select('body').append('div')
					.attr('class', 'scene_info')
					.style('opacity', high_opacity)
					.html(scene_info_title)
					.on('dblclick', function(d) {
						d3.select(this).style('opacity', high_opacity)
							.style('left', null)
							.style('top', null);
					})
					.call(d3.behavior.drag()
						.on('drag', dragged)
					);
var set_scene_info = function (msg) {
	scene_info.html(scene_info_title + msg)
		.style('opacity', high_opacity);
};


d3.select('body').append('h1')
	.html(narrative_data.title)
	.attr('class', 'story-title');
document.title = narrative_data.title;


let narrative_context = narrative_init(narrative_data);



var mapSvg;

var lineSvg;
var lineWidth;
var lineHeight;
var lineInnerHeight;
var lineInnerWidth;
var lineMargin = { top: 20, right: 60, bottom: 60, left: 100 };

var mapData;
var timeData;

// This runs when the page is loaded

document.addEventListener('DOMContentLoaded', function () {
  mapSvg = d3.select('#map');
  lineSvg = d3.select('#linechart');
  lineWidth = +lineSvg.style('width').replace('px', '');
  lineHeight = +lineSvg.style('height').replace('px', '');;
  lineInnerWidth = lineWidth - lineMargin.left - lineMargin.right;
  lineInnerHeight = lineHeight - lineMargin.top - lineMargin.bottom;

  // Load both files located in 'data' library
  Promise.all([d3.json('data/neweurope.geo.json'),
  d3.csv('data/worldgdp.csv')])
    .then(function (values) {

      mapData = values[0];
      timeData = values[1];

      drawMap();
    })

});

// Get the min/max values for a year and return as an array of size=2.
function getExtentsForYear(yearData) {
  var max = Number.MIN_VALUE;
  var min = Number.MAX_VALUE;
  for (var key in yearData) {
    if (key == 'Year')
      continue;
    let val = +yearData[key];
    if (val > max)
      max = val;
    if (val < min)
      min = val;
  }
  return [min, max];

}

// Draw the map in the #map svg

var year = "2000";    //first year that is drawn when the user loads the page
function drawMap() {

  mapSvg.select('g').remove();
  mapSvg.selectAll("defs").remove();
  // create the map projection and geoPath
  year = document.getElementById("year-input").value;


  let projection = d3.geoMercator()
    .scale(350)
    .center(d3.geoCentroid(mapData))
    .translate([+mapSvg.style('width').replace('px', '') / 2,
    +mapSvg.style('height').replace('px', '') / 2.3]);
  let path = d3.geoPath()
    .projection(projection);

  
  // get the GDP values for countries for the selected year
  let yearData = timeData.filter(d => d.Year == year)[0];

  // get the min/max GDP values for the selected year
  let extent = getExtentsForYear(yearData);


  var temp = document.getElementById("color-scale-select").value;
  console.log(temp);

  if (temp == "interpolateRdYlGn") {
    var colorScale = d3.scaleSequential(d3.interpolateRdYlGn)
      .domain(extent);
  }
  else if (temp == "interpolateViridis") {
    var colorScale = d3.scaleSequential(d3.interpolateViridis)
      .domain(extent);
  }
  else if (temp == "interpolateBrBG") {
    var colorScale = d3.scaleSequential(d3.interpolateBrBG)
      .domain(extent);
  }

  var div = d3.select("body").append("div")
    .attr("class", "tooltip-donut")
    .style("opacity", 0);

  // draw the map on the #map svg
  let g = mapSvg.append('g');




  g.selectAll('path')
    .data(mapData.features)
    .enter()
    .append('path')
    .attr('d', path)
    .attr('id', d => { return d.properties.name })
    .attr('class', 'countrymap')
    .style('fill', d => {
      let val = +yearData[d.properties.name];
      if (isNaN(val))
        return 'white';
      return colorScale(val);
    })
    .on('mouseover', function (d, i) {
      d3.select(this).transition()
        .duration('50')
        .style('stroke', 'cyan')    //when country has mouse over, it highlights border cyan
        .style('stroke-width', '4px') //border thichness of 4px
      console.log('mouseover on ' + d.properties.name);   //debugging purposes
      div.transition()
        .duration(50)
        .style("opacity", 1);


      div.html("Country: " + d.properties.name + "<br> " + "GDP: " + yearData[d.properties.name])

        .style("left", (d3.event.pageX) + "px")
        .style("top", (d3.event.pageY) + "px");



    })
    .on('mousemove', function (d, i) {
      console.log('mousemove on ' + d.properties.name);
    })
    .on('mouseout', function (d, i) {
      d3.select(this).transition()
        .duration('50')
        .attr('opacity', '1')
        .style('stroke', 'black')   //when mouse moves out of highlighted country the border goes back to black.
        .style('stroke-width', '1px') //border thickness of 1px
      console.log('mouseout on ' + d.properties.name); ////debugging purposes
      div.transition()
        .style("opacity", 0);

    })
    .on('click', function (d, i) {
      console.log('clicked on ' + d.properties.name);   //debugging purposes

      country = d.properties.name
      drawLineChart(country);



    });

 
    //color scale legend
  const linearGradient = mapSvg
    .append("defs")
    .append("linearGradient")
    .attr("id", "linear-gradient");

  linearGradient.selectAll("stop")
    .data(colorScale.ticks()
      .map((t, i, n) => ({ offset: `${(100 * i) / n.length}%`, color: colorScale(t), })))
    .enter()
    .append("stop")
    .attr("offset", (d) => d.offset)
    .attr("stop-color", (d) => d.color);

  g.append("g")
    .append("rect")
    .attr("transform", `translate(20,${lineInnerHeight - 20})`)
    .attr("width", 200)
    .attr("height", 20)
    .style("fill", "url(#linear-gradient)");

  const colorAxis = d3
    .axisBottom(d3.scaleLinear().domain(colorScale.domain()).range([0, 200]))
    .ticks(5)
    .tickSize(-20);

  g.append("g")
    .call(colorAxis)
    .attr("transform", `translate(20,${lineInnerHeight})`)
    .attr("class", "colorLegend");




}


// Draw the line chart in the #linechart svg for
// the country argument (e.g., `Egypt').
function drawLineChart(country) {
  console.log(timeData);

  //Data Wrangling
  timeData.forEach(d => {
    console.log(d)
    for (var key in d) {
      if (key == 'Year') {
        d.date = d3.timeParse('%Y-%m-%d')(d.Year);
        continue
      } else {
        d[key] = +d[key]
      }
    }
  });

  if (!country)
    return;

  const xAttrib = d3.select('#year-input').property('value');
  let min = new Date(1960, 0);
  let max = new Date(2011, 0);

  //x and y scales
  const xScale = d3.scaleTime()
    .domain([min, max]) //year
    .range([0, lineInnerWidth]); // pixel space
  const yScale = d3.scaleLinear()
    .domain([0, d3.max(timeData, d => d[country])])
    .range([lineInnerHeight, 0]); // pixel space
    

  lineSvg.select('g').remove();
  const g = lineSvg.append('g')
    .attr('transform', 'translate(' + lineMargin.left + ', ' + lineMargin.top + ')');;



  // X and Y axisS

  g.append('g')
    
    .call(d3.axisLeft(yScale))   

  g.append('g')
    .attr('transform', `translate(0,${lineInnerHeight})`)
    .call(d3.axisBottom(xScale))



  //D3 line generator
  const singleLine = d3.line()
    .x(d => xScale(new Date(d.Year, 0)))
    .y(d => yScale(d[country]))
    .curve(d3.curveMonotoneX)

  
  g.append('path')
    .datum(timeData)
    .attr('class', 'singleLine')
    .style('fill', 'none')
    .style('stroke', 'black')
    .style('stroke-width', '1')
    .attr('d', singleLine);

  //labels(g)
  g.append('text')
    .attr('x', lineInnerWidth / 2)
    .attr('y', lineInnerHeight + 40)
    .text("Year");
  g.append('text')
    .attr('transform', 'rotate(-90)')
    .attr('y', '-40px')
    .attr('x', -lineInnerHeight / 2)
    .attr('text-anchor', 'middle')
    .text('GDP for ' + country + ' (based on current USD)');


    

}

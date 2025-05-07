import { fetchJSON, renderProjects } from '../global.js';
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

const projects = await fetchJSON('../lib/projects.json');
const projectsContainer = document.querySelector('.projects');

renderProjects(projects, projectsContainer, 'h2');

const titleElement = document.querySelector('.projects-title');
if (titleElement) {
    titleElement.textContent = `${projects.length} Projects`;
}

let selectedIndex = -1;

function renderPieChart(projectsGiven) {
    // Group by year and count
    let newRolledData = d3.rollups(
        projectsGiven,
        (v) => v.length,
        (d) => d.year,
    );
  
    // Transform to chart-ready format
    let newData = newRolledData.map(([year, count]) => {
        return { value: count, label: year };
    });
  
    // Arc and color setup
    let arcGenerator = d3.arc().innerRadius(0).outerRadius(50);
    let colors = d3.scaleOrdinal(d3.schemeTableau10);
  
    // Pie layout
    let newSliceGenerator = d3.pie().value((d) => d.value);
    let newArcData = newSliceGenerator(newData);
    let newArcs = newArcData.map((d) => arcGenerator(d));
  
    // Clear existing paths and legends
    let newSVG = d3.select('svg');
    newSVG.selectAll('path').remove();
    let legend = d3.select('.legend');
    legend.selectAll('li').remove();
  
    // Append new pie paths
    newArcs.forEach((arc, index) => {
        newSVG.append('path')
            .attr('d', arc)
            .attr('fill', colors(index))
            .on('click', () => {
                selectedIndex = selectedIndex === index ? -1 : index;

                // Update selected slice in the SVG
                newSVG.selectAll('path')
                    .attr('class', (_, idx) => selectedIndex === idx ? 'selected' : '');

                // Update legend items
                legend.selectAll('li')
                    .attr('class', (_, idx) => selectedIndex === idx ? 'selected' : '');

                // Filter projects based on selected year
                if (selectedIndex === -1) {
                    renderProjects(projects, projectsContainer, 'h2');
                } else {
                    const selectedYear = newData[selectedIndex].label;
                    const filteredProjects = projects.filter(project => project.year === selectedYear);
                    renderProjects(filteredProjects, projectsContainer, 'h2');
                }
            });
    });
  
    // Append legend items
    newData.forEach((d, idx) => {
        legend.append('li')
            .attr('style', `--color:${colors(idx)}`)
            .attr('class', 'legend-item')
            .html(`<span class="swatch"></span> ${d.label} <em>(${d.value})</em>`)
            .on('click', () => {
                // Handle legend item click
                selectedIndex = selectedIndex === idx ? -1 : idx;

                // Update selected legend and corresponding pie slice
                newSVG.selectAll('path')
                    .attr('class', (_, pathIdx) => selectedIndex === pathIdx ? 'selected' : '');
                legend.selectAll('li')
                    .attr('class', (_, legendIdx) => selectedIndex === legendIdx ? 'selected' : '');

                // Filter projects based on selected year
                if (selectedIndex === -1) {
                    renderProjects(projects, projectsContainer, 'h2');
                } else {
                    const selectedYear = newData[selectedIndex].label;
                    const filteredProjects = projects.filter(project => project.year === selectedYear);
                    renderProjects(filteredProjects, projectsContainer, 'h2');
                }
            });
    });
}``

// Initial render
renderPieChart(projects);

let searchInput = document.querySelector('.searchBar');

// Filter on input change
searchInput.addEventListener('input', (event) => {
    let query = event.target.value.toLowerCase();
    let filteredProjects = projects.filter((project) => {
        let values = Object.values(project).join('\n').toLowerCase();
        return values.includes(query);
    });

    renderProjects(filteredProjects, projectsContainer, 'h2');
    renderPieChart(filteredProjects);
});

import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

let xScale, yScale, globalCommits;



async function loadData() {
    const data = await d3.csv('loc.csv', (row) => ({
        ...row,
        line: Number(row.line), // or just +row.line
        depth: Number(row.depth),
        length: Number(row.length),
        date: new Date(row.date + 'T00:00' + row.timezone),
        datetime: new Date(row.datetime),
      }));
    
    return data;
  }


function processCommits(data) {
    return d3
      .groups(data, (d) => d.commit)
      .map(([commit, lines]) => {
        let first = lines[0];
        let { author, date, time, timezone, datetime } = first;
        let ret = {
          id: commit,
          url: 'https://github.com/vis-society/lab-7/commit/' + commit,
          author,
          date,
          time,
          timezone,
          datetime,
          hourFrac: datetime.getHours() + datetime.getMinutes() / 60,
          totalLines: lines.length,
        };
  
        Object.defineProperty(ret, 'lines', {
            value: lines,
            writable: false,      // Optional: prevents reassignment
            configurable: false,  // Optional: prevents deletion or redefinition
            enumerable: false     // ❗ This is the key: it hides it from console.log and JSON.stringify
        });
  
        return ret;
      });
  }



function renderCommitInfo(data, commits) {
    // Create the dl element
    const dl = d3.select('#stats').append('dl').attr('class', 'stats');
  
    // Add total LOC
    dl.append('dt').html('Total <abbr title="Lines of code">LOC</abbr>');
    dl.append('dd').text(data.length);
  
    // Add total commits
    dl.append('dt').text('Total commits');
    dl.append('dd').text(commits.length);
  
    // Add more stats as needed...
    let mostLinesCommitted = 0
    for (const commit of commits) {
        if (commit.totalLines > mostLinesCommitted) {
            mostLinesCommitted = commit.totalLines;
        }
    }

    dl.append('dt').text('Most Lines Committed');
    dl.append('dd').text(mostLinesCommitted);


    const fileSet = new Set();
    for (const commit of commits) {
        for (const line of commit.lines) {
            if (line.file) {
            fileSet.add(line.file);
            }
        }
    }
    const numFiles = fileSet.size;
    dl.append('dt').text('Total Number of Files');
    dl.append('dd').text(numFiles);
    

    let maxLineLength = 0;
    for (const commit of commits) {
        for (const line of commit.lines) {
            if (line.length > maxLineLength) {
                maxLineLength = line.length;
            }
        }
    }

    dl.append('dt').text('Maximum Line Length');
    dl.append('dd').text(maxLineLength);
    
}
  

function renderScatterPlot(data, commits) {
    const sortedCommits = d3.sort(commits, (d) => -d.totalLines);
    // Put all the JS code of Steps inside this function
    const width = 1000;
    const height = 600;

    const svg = d3
    .select('#chart')
    .append('svg')
    .attr('viewBox', `0 0 ${width} ${height}`)
    .style('overflow', 'visible');

    const margin = { top: 10, right: 10, bottom: 30, left: 20 };

    const usableArea = {
        top: margin.top,
        right: width - margin.right,
        bottom: height - margin.bottom,
        left: margin.left,
        width: width - margin.left - margin.right,
        height: height - margin.top - margin.bottom,
      };
    
    xScale = d3
    .scaleTime()
    .domain(d3.extent(commits, (d) => d.datetime))
    .range([0, width])
    .nice();

    yScale = d3.scaleLinear().domain([0, 24]).range([height, 0]);

    globalCommits = commits;

    const dots = svg.append('g').attr('class', 'dots');

    const [minLines, maxLines] = d3.extent(commits, (d) => d.totalLines);
    const rScale = d3
    .scaleSqrt() // Change only this line
    .domain([minLines, maxLines])
    .range([5, 35]);

    dots
  .selectAll('circle')
  .data(sortedCommits)
  .join('circle')
  .attr('cx', (d) => xScale(d.datetime))
  .attr('cy', (d) => yScale(d.hourFrac))
  .attr('r', 5)
  .attr('fill', 'steelblue')
  .attr('r', (d) => rScale(d.totalLines))
  .style('fill-opacity', 0.7) // Add transparency for overlapping dots
  .on('mouseenter', (event, commit) => {
    renderTooltipContent(commit);
    updateTooltipVisibility(true);
    updateTooltipPosition(event);
  })
  .on('mouseleave', () => {
    updateTooltipVisibility(false);
  });


      
      // Update scales with new ranges
    xScale.range([usableArea.left, usableArea.right]);
    yScale.range([usableArea.bottom, usableArea.top]);


    // Add gridlines BEFORE the axes
    const gridlines = svg
    .append('g')
    .attr('class', 'gridlines')
    .attr('transform', `translate(${usableArea.left}, 0)`);

    // Create gridlines as an axis with no labels and full-width ticks
    gridlines.call(d3.axisLeft(yScale).tickFormat('').tickSize(-usableArea.width));




    const xAxis = d3.axisBottom(xScale);
    const yAxis = d3
  .axisLeft(yScale)
  .tickFormat((d) => String(d % 24).padStart(2, '0') + ':00');

    // Add X axis
    svg
    .append('g')
    .attr('transform', `translate(0, ${usableArea.bottom})`)
    .call(xAxis);

    // Add Y axis
    svg
    .append('g')
    .attr('transform', `translate(${usableArea.left}, 0)`)
    .call(yAxis);

//     svg.append('g')
//   .attr('class', 'brush')
//   .call(d3.brush()
//     .on('start brush end', brushed));
    svg.append('g')
  .attr('class', 'brush')
  .call(d3.brush()
    .extent([[usableArea.left, usableArea.top], [usableArea.left + usableArea.width, usableArea.top + usableArea.height]])
    .on('start brush end', brushed));

// Raise dots above overlay so tooltips still work
svg.selectAll('.dots, .overlay ~ *').raise();


}


function renderTooltipContent(commit) {
    const link = document.getElementById('commit-link');
    const date = document.getElementById('commit-date');
  
    if (Object.keys(commit).length === 0) return;
  
    link.href = commit.url;
    link.textContent = commit.id;
    date.textContent = commit.datetime?.toLocaleString('en', {
      dateStyle: 'full',
    });
}


function updateTooltipVisibility(isVisible) {
    const tooltip = document.getElementById('commit-tooltip');
    tooltip.hidden = !isVisible;
}


function updateTooltipPosition(event) {
    const tooltip = document.getElementById('commit-tooltip');
    tooltip.style.left = `${event.clientX}px`;
    tooltip.style.top = `${event.clientY}px`;
}


function createBrushSelector(svg) {
    svg.call(d3.brush());
  }


function brushed(event) {
    const selection = event.selection;
    d3.selectAll('circle').classed('selected', (d) =>
      isCommitSelected(selection, d),
    );
    renderSelectionCount(selection);
    renderLanguageBreakdown(selection);
  }



function isCommitSelected(selection, commit) {
    if (!selection) {
      return false;
    }
    // TODO: return true if commit is within brushSelection
    // and false if not
    if (!selection) return false;

    const [[x0, y0], [x1, y1]] = selection;

    const cx = xScale(commit.datetime);
    const cy = yScale(commit.hourFrac);

    return x0 <= cx && cx <= x1 && y0 <= cy && cy <= y1;
}

function renderSelectionCount(selection) {
    const selectedCommits = selection
      ? globalCommits.filter((d) => isCommitSelected(selection, d))
      : [];
  
    const countElement = document.querySelector('#selection-count');
    countElement.textContent = `${
      selectedCommits.length || 'No'
    } commits selected`;
  
    return selectedCommits;
  }

// function renderLanguageBreakdown(selection) {
//     const selectedCommits = selection
//       ? commits.filter((d) => isCommitSelected(selection, d))
//       : [];
//     const container = document.getElementById('language-breakdown');
  
//     if (selectedCommits.length === 0) {
//       container.innerHTML = '';
//       return;
//     }
//     const requiredCommits = selectedCommits.length ? selectedCommits : commits;
//     const lines = requiredCommits.flatMap((d) => d.lines);
  
//     // Use d3.rollup to count lines per language
//     const breakdown = d3.rollup(
//       lines,
//       (v) => v.length,
//       (d) => d.type,
//     );
  
//     // Update DOM with breakdown
//     container.innerHTML = '';
  
//     for (const [language, count] of breakdown) {
//       const proportion = count / lines.length;
//       const formatted = d3.format('.1~%')(proportion);
  
//       container.innerHTML += `
//               <dt>${language}</dt>
//               <dd>${count} lines (${formatted})</dd>
//           `;
//     }
//   }

function renderLanguageBreakdown(selection) {
    const selectedCommits = selection
      ? globalCommits.filter((d) => isCommitSelected(selection, d))
      : [];
  
    const container = document.getElementById('language-breakdown');
  
    if (selectedCommits.length === 0) {
      container.innerHTML = '';
      return;
    }
  
    const requiredCommits = selectedCommits.length ? selectedCommits : globalCommits;
    const lines = requiredCommits.flatMap((d) => d.lines);
  
    const breakdown = d3.rollup(
      lines,
      (v) => v.length,
      (d) => d.type // make sure 'type' exists in your CSV
    );
  
    container.innerHTML = '';
  
    for (const [language, count] of breakdown) {
      const proportion = count / lines.length;
      const formatted = d3.format('.1~%')(proportion);
  
      container.innerHTML += `
        <dt>${language}</dt>
        <dd>${count} lines (${formatted})</dd>
      `;
    }
  }
  

let data = await loadData();
console.log("First row of data:", data[0]);

let commits = processCommits(data);
renderCommitInfo(data, commits);
renderScatterPlot(data, commits);


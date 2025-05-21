import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

let xScale, yScale, globalCommits;
let NUM_ITEMS = 100;
let ITEM_HEIGHT = 160;
let VISIBLE_COUNT = 10;
let totalHeight;
let globalFiles = [];

const scrollContainer = d3.select('#scroll-container');
const spacer = d3.select('#spacer');
const itemsContainer = d3.select('#items-container');

function loadData() {
    return d3.csv('loc.csv', (row) => ({
        ...row,
        line: Number(row.line),
        depth: Number(row.depth),
        length: Number(row.length),
        date: new Date(row.date + 'T00:00' + row.timezone),
        datetime: new Date(row.datetime),
    }));
}

function processCommits(data) {
    return d3
        .groups(data, (d) => d.commit)
        .map(([commit, lines]) => {
            let first = lines[0];
            let { author, date, time, timezone, datetime } = first;
            
            // Process file changes
            const fileChanges = d3.rollups(
                lines,
                (fileLines) => ({
                    additions: fileLines.filter(l => l.line > 0).length,
                    deletions: fileLines.filter(l => l.line < 0).length,
                    changes: fileLines.length
                }),
                (d) => d.file
            ).map(([filename, stats]) => ({
                filename,
                ...stats
            }));

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
                files: fileChanges,
                message: first.message || 'No commit message'
            };

            Object.defineProperty(ret, 'lines', {
                value: lines,
                writable: false,
                configurable: false,
                enumerable: false
            });

            return ret;
        });
}

function renderCommitInfo(data, commits) {
    const dl = d3.select('#stats').append('dl').attr('class', 'stats');
    dl.append('dt').html('Total <abbr title="Lines of code">LOC</abbr>');
    dl.append('dd').text(data.length);
    dl.append('dt').text('Total commits');
    dl.append('dd').text(commits.length);

    const mostLinesCommitted = d3.max(commits, (d) => d.totalLines);
    dl.append('dt').text('Most Lines Committed');
    dl.append('dd').text(mostLinesCommitted);

    const fileSet = new Set(commits.flatMap(commit => commit.lines.map(line => line.file)));
    dl.append('dt').text('Total Number of Files');
    dl.append('dd').text(fileSet.size);

    const maxLineLength = d3.max(commits.flatMap(commit => commit.lines.map(line => line.length)));
    dl.append('dt').text('Maximum Line Length');
    dl.append('dd').text(maxLineLength);
}

function renderScatterPlot(data, commits) {
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
        .range([usableArea.left, usableArea.right])
        .nice();

    yScale = d3.scaleLinear()
        .domain([0, 24])
        .range([usableArea.bottom, usableArea.top]);

    const rScale = d3
        .scaleSqrt()
        .domain(d3.extent(commits, (d) => d.totalLines))
        .range([5, 35]);

    const dots = svg.append('g').attr('class', 'dots');

    dots
        .selectAll('circle')
        .data(commits)
        .join('circle')
        .attr('cx', (d) => xScale(d.datetime))
        .attr('cy', (d) => yScale(d.hourFrac))
        .attr('r', (d) => rScale(d.totalLines))
        .attr('fill', 'steelblue')
        .style('fill-opacity', 0.7)
        .on('mouseenter', (event, commit) => {
            renderTooltipContent(commit);
            updateTooltipVisibility(true);
            updateTooltipPosition(event);
        })
        .on('mouseleave', () => {
            updateTooltipVisibility(false);
        });

    const gridlines = svg
        .append('g')
        .attr('class', 'gridlines')
        .attr('transform', `translate(${usableArea.left}, 0)`);

    gridlines.call(d3.axisLeft(yScale).tickFormat('').tickSize(-usableArea.width));

    const xAxis = d3.axisBottom(xScale);
    const yAxis = d3
        .axisLeft(yScale)
        .tickFormat((d) => String(d % 24).padStart(2, '0') + ':00');

    svg
        .append('g')
        .attr('transform', `translate(0, ${usableArea.bottom})`)
        .call(xAxis);

    svg
        .append('g')
        .attr('transform', `translate(${usableArea.left}, 0)`)
        .call(yAxis);

    svg.selectAll('.dots, .overlay ~ *').raise();
}

function updateScatterPlot(visibleCommits) {
    const dots = d3.select('#chart').select('.dots');
    if (!dots.empty()) {
        dots.selectAll('circle')
            .style('fill-opacity', d => visibleCommits.includes(d) ? 0.7 : 0.1);
    }
}

function renderItems(startIndex) {
    const endIndex = Math.min(startIndex + VISIBLE_COUNT, globalCommits.length);
    const newCommitSlice = globalCommits.slice(startIndex, endIndex);

    updateScatterPlot(newCommitSlice);

    // Remove only the items that are no longer visible
    itemsContainer.selectAll('div.item')
        .filter((_, i) => i < startIndex || i >= endIndex)
        .remove();

    // Add new items that should be visible
    const existingItems = itemsContainer.selectAll('div.item').data();
    newCommitSlice.forEach((commit, index) => {
        if (!existingItems.includes(commit)) {
            const fileCount = d3.rollups(commit.lines, d => d.length, d => d.file).length;
            const dateStr = commit.datetime.toLocaleString("en", { dateStyle: "full", timeStyle: "short" });
            const item = itemsContainer.append('div')
                .attr('class', 'item')
                .html(`
                    <p>
                        On ${dateStr}, I made
                        <a href="${commit.url}" target="_blank">
                            ${index > 0 ? 'another glorious commit' : 'my first commit, and it was glorious'}
                        </a>. I edited ${commit.totalLines} lines across ${fileCount} files.
                        Then I looked over all I had made, and I saw that it was very good.
                    </p>
                `)
                .style('position', 'absolute')
                .style('top', `${(startIndex + index) * ITEM_HEIGHT}px`);
        }
    });
}

function displayCommitFiles(commit) {
    const files = commit.files || [];
    const container = document.createElement('div');
    container.className = 'files-item';

    const title = document.createElement('h3');
    title.textContent = commit.message;
    container.appendChild(title);

    const filesList = document.createElement('dl');
    filesList.className = 'files';

    files.forEach(file => {
        const dt = document.createElement('dt');
        dt.textContent = file.filename;
        filesList.appendChild(dt);

        const dd = document.createElement('dd');
        const changes = [];
        if (file.additions > 0) {
            changes.push(`${file.additions} line${file.additions === 1 ? '' : 's'} added`);
        }
        if (file.deletions > 0) {
            changes.push(`${file.deletions} line${file.deletions === 1 ? '' : 's'} removed`);
        }
        dd.textContent = changes.join(', ');
        filesList.appendChild(dd);
    });

    container.appendChild(filesList);
    return container;
}

function renderFilesItems(index) {
    const container = document.getElementById('files-items-container');
    container.innerHTML = '';
    
    // Get all commits up to the current index
    const newFilesSlice = globalFiles.slice(0, index + 1);
    
    // Get all lines from all commits up to this point
    const lines = newFilesSlice.flatMap(d => d.lines);
    
    // Group lines by file and sort by total lines
    let files = d3
        .groups(lines, d => d.file)
        .map(([name, lines]) => ({
            name,
            lines,
            totalLines: lines.length,
            additions: lines.filter(l => l.line > 0).length,
            deletions: lines.filter(l => l.line < 0).length
        }));
    
    // Sort files by number of lines in descending order
    files = d3.sort(files, d => -d.totalLines);
    
    // Create the files container for the scrollytelling section
    const filesContainer = d3.select(container)
        .append('dl')
        .attr('class', 'files')
        .selectAll('div')
        .data(files)
        .enter()
        .append('div');
    
    // Add file names and line counts
    filesContainer.append('dt')
        .html(d => `<code>${d.name}</code><small>${d.totalLines} lines</small>`);
    
    // Add text description for each file
    filesContainer.append('dd')
        .text(d => {
            const changes = [];
            if (d.additions > 0) changes.push(`${d.additions} line${d.additions === 1 ? '' : 's'} added`);
            if (d.deletions > 0) changes.push(`${d.deletions} line${d.deletions === 1 ? '' : 's'} removed`);
            return changes.join(', ');
        });

    // Update the unit visualization
    updateFilesVisualization(files);
}

function updateFilesVisualization(files) {
    const chartContainer = document.getElementById('files-chart');
    chartContainer.innerHTML = '';

    const width = 400;
    const height = 350;
    const margin = { top: 20, right: 20, bottom: 20, left: 20 };

    const svg = d3.select(chartContainer)
        .append('svg')
        .attr('width', width)
        .attr('height', height);

    // Create color scale for file types
    const fileTypeColors = d3.scaleOrdinal(d3.schemeTableau10);

    // Calculate positions for each file's dots
    const fileHeight = height / Math.min(files.length, 10); // Show at most 10 files at a time
    const dotsPerRow = Math.floor((width - margin.left - margin.right) / 10); // 10px per dot

    // Only show top 10 files in the visualization
    const topFiles = files.slice(0, 10);

    topFiles.forEach((file, i) => {
        const y = i * fileHeight + fileHeight / 2;
        const fileGroup = svg.append('g')
            .attr('transform', `translate(${margin.left}, ${y - 10})`);

        // Add file name
        fileGroup.append('text')
            .attr('x', 0)
            .attr('y', -5)
            .text(file.name)
            .style('font-size', '10px')
            .style('fill', '#666');

        // Add dots for each line
        file.lines.forEach((line, j) => {
            const row = Math.floor(j / dotsPerRow);
            const col = j % dotsPerRow;
            fileGroup.append('circle')
                .attr('cx', col * 10)
                .attr('cy', row * 10)
                .attr('r', 3)
                .attr('fill', fileTypeColors(line.type || 'unknown'));
        });
    });
}

async function main() {
    const data = await loadData();
    const commits = processCommits(data);
    globalCommits = commits;
    NUM_ITEMS = commits.length;
    totalHeight = (NUM_ITEMS - 1) * ITEM_HEIGHT;
    spacer.style('height', `${totalHeight}px`);

    renderCommitInfo(data, commits);
    renderScatterPlot(data, commits);

    scrollContainer.on('scroll', () => {
        const scrollTop = scrollContainer.property('scrollTop');
        let startIndex = Math.floor(scrollTop / ITEM_HEIGHT);
        startIndex = Math.max(0, Math.min(startIndex, commits.length - VISIBLE_COUNT));
        renderItems(startIndex);
    });

    renderItems(0);

    // Initialize files data
    globalFiles = commits;
    
    // Set up files scroll container
    const filesScrollContainer = document.getElementById('files-scroll-container');
    const filesSpacer = document.getElementById('files-spacer');
    const filesItemHeight = 120; // Match the new CSS height
    filesSpacer.style.height = `${globalFiles.length * filesItemHeight}px`;
    
    filesScrollContainer.addEventListener('scroll', () => {
        const scrollPosition = filesScrollContainer.scrollTop;
        const index = Math.floor(scrollPosition / filesItemHeight);
        renderFilesItems(index);
    });
    
    // Initial render
    renderFilesItems(0);
}

main();

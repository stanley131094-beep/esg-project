document.addEventListener('DOMContentLoaded', () => {
    // ---- Theme Toggle Logic ----
    const themeToggleBtn = document.getElementById('theme-toggle');
    const htmlEl = document.documentElement;
    const themeIcon = themeToggleBtn.querySelector('i');

    // Check system preference or localStorage
    const savedTheme = localStorage.getItem('esg-theme');
    if (savedTheme) {
        htmlEl.setAttribute('data-theme', savedTheme);
        updateThemeIcon(savedTheme);
    } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        htmlEl.setAttribute('data-theme', 'dark');
        updateThemeIcon('dark');
    }

    themeToggleBtn.addEventListener('click', () => {
        const currentTheme = htmlEl.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        htmlEl.setAttribute('data-theme', newTheme);
        localStorage.setItem('esg-theme', newTheme);
        updateThemeIcon(newTheme);
        
        // Update chart colors if chart exists
        if (emissionChartInstance) {
            updateChartTheme(newTheme);
        }
    });

    function updateThemeIcon(theme) {
        if (theme === 'dark') {
            themeIcon.className = 'fa-solid fa-sun';
        } else {
            themeIcon.className = 'fa-solid fa-moon';
        }
    }

    // ---- Calculator Logic ----
    const form = document.getElementById('calculator-form');
    const fillDemoBtn = document.getElementById('fill-demo');
    const emptyState = document.getElementById('empty-state');
    const resultsView = document.getElementById('results-view');
    let emissionChartInstance = null;

    // Constants for emission factors (kgCO2e per unit)
    const FACTORS = {
        fuel: 2.36,     // kgCO2e/L
        gas: 1.88,      // kgCO2e/degree
        elec: 0.495,    // kgCO2e/kWh (Taiwan Power Company estimate)
        water: 0.15,    // kgCO2e/degree
        flight: 0.09,   // kgCO2e/km
        commute: 0.04   // kgCO2e/km
    };

    fillDemoBtn.addEventListener('click', () => {
        document.getElementById('company-name').value = '星宇科技股份有限公司';
        document.getElementById('industry').value = '科技業';
        document.getElementById('employees').value = '150';
        
        document.getElementById('scope1-fuel').value = '5000';
        document.getElementById('scope1-gas').value = '1200';
        
        document.getElementById('scope2-elec').value = '1200000';
        document.getElementById('scope2-water').value = '8000';
        
        document.getElementById('scope3-flight').value = '150000';
        document.getElementById('scope3-commute').value = '850000';
    });

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        
        // 1. Gather inputs
        const companyName = document.getElementById('company-name').value || '-';
        const industry = document.getElementById('industry').value || '-';
        const employees = parseInt(document.getElementById('employees').value) || 1;

        const val = (id) => parseFloat(document.getElementById(id).value) || 0;
        const s1_fuel = val('scope1-fuel');
        const s1_gas = val('scope1-gas');
        const s2_elec = val('scope2-elec');
        const s2_water = val('scope2-water');
        const s3_flight = val('scope3-flight');
        const s3_commute = val('scope3-commute');

        // 2. Calculate Emissions (Convert kg to tons -> divide by 1000)
        const scope1 = (s1_fuel * FACTORS.fuel + s1_gas * FACTORS.gas) / 1000;
        const scope2 = (s2_elec * FACTORS.elec + s2_water * FACTORS.water) / 1000;
        const scope3 = (s3_flight * FACTORS.flight + s3_commute * FACTORS.commute) / 1000;
        
        const total = scope1 + scope2 + scope3;
        const perCapita = total / employees;

        // 3. Update DOM
        document.getElementById('report-date').textContent = `報告生成日期：${new Date().toLocaleDateString('zh-TW')}`;
        document.getElementById('res-company').textContent = companyName;
        document.getElementById('res-industry').textContent = industry;
        document.getElementById('res-employees').textContent = employees;
        
        // Animate numbers
        animateValue('res-total', parseFloat(document.getElementById('res-total').textContent) || 0, total, 1000, 2);
        
        document.getElementById('res-per-capita').textContent = perCapita.toFixed(2);
        
        document.getElementById('res-scope1').textContent = scope1.toFixed(2);
        document.getElementById('res-scope2').textContent = scope2.toFixed(2);
        document.getElementById('res-scope3').textContent = scope3.toFixed(2);

        // 4. Switch Views
        emptyState.classList.remove('active');
        resultsView.classList.add('active');

        // 5. Render Chart
        renderChart(scope1, scope2, scope3);
        
        // Scroll to results on mobile
        if(window.innerWidth < 992) {
            resultsView.scrollIntoView({ behavior: 'smooth' });
        }
    });

    document.getElementById('print-report').addEventListener('click', () => {
        window.print();
    });

    function animateValue(id, start, end, duration, decimals) {
        if (start === end) {
            document.getElementById(id).innerHTML = end.toFixed(decimals);
            return;
        }
        const obj = document.getElementById(id);
        let startTimestamp = null;
        const step = (timestamp) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            // easeOutQuart
            const easeProgress = 1 - Math.pow(1 - progress, 4);
            const currentObj = start + easeProgress * (end - start);
            obj.innerHTML = currentObj.toFixed(decimals);
            if (progress < 1) {
                window.requestAnimationFrame(step);
            }
        };
        window.requestAnimationFrame(step);
    }

    function renderChart(s1, s2, s3) {
        const ctx = document.getElementById('emissionChart').getContext('2d');
        const theme = document.documentElement.getAttribute('data-theme');
        const textColor = theme === 'dark' ? '#ffffff' : '#2b3674';

        if (emissionChartInstance) {
            emissionChartInstance.destroy();
        }

        // Parse colors from CSS vars
        const style = getComputedStyle(document.body);
        const c1 = style.getPropertyValue('--scope1-color').trim() || '#ff7e67';
        const c2 = style.getPropertyValue('--scope2-color').trim() || '#00e396';
        const c3 = style.getPropertyValue('--scope3-color').trim() || '#feb019';

        emissionChartInstance = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['範疇一 (直接排放)', '範疇二 (間接能源)', '範疇三 (其他間接)'],
                datasets: [{
                    data: [s1, s2, s3],
                    backgroundColor: [c1, c2, c3],
                    borderWidth: 0,
                    hoverOffset: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '70%',
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: textColor,
                            font: {
                                family: "'Inter', sans-serif"
                            },
                            padding: 20
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                let label = context.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                if (context.parsed !== null) {
                                    label += context.parsed.toFixed(2) + ' 噸 CO₂e';
                                }
                                return label;
                            }
                        }
                    }
                }
            }
        });
    }

    function updateChartTheme(theme) {
        if(!emissionChartInstance) return;
        const textColor = theme === 'dark' ? '#ffffff' : '#2b3674';
        emissionChartInstance.options.plugins.legend.labels.color = textColor;
        emissionChartInstance.update();
    }
});

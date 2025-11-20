function parseVisits(s) {
    let total = 0;
    const totalCountries = {};
    const dataXY = [];
    for (const item of s) {
        const t = Number(item.total) || 0;
        total += t;
        const byLocation = item.byLocation || {};
        for (const [name, val] of Object.entries(byLocation)) {
            totalCountries[name] = (totalCountries[name] || 0) + Number(val || 0);
        }
        dataXY.push({ date: item.date, visits: t });
    }
    return { total, totalCountries, dataXY };
}

export { parseVisits };

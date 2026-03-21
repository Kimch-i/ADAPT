export async function fetchRemotive(jobTitle) {
    try {
        const res = await fetch(
            `https://remotive.com/api/remote-jobs?search=${encodeURIComponent(jobTitle)}&limit=5`
        );
        if(!res.ok) return [];
        const data = await res.json();
        return (data.jobs || []).map(job => ({
            title: job.title,
            company: job.company_name,
            location: 'Remote',
            isRemote: true,
            url: job.url,
            salary: job.salary || null,
            postedAt: job.publication_date,
            source: 'remotive'
        }));
    } catch (err) {
        console.error("Remotive fetch failed", err);
        return [];
    }
}

export async function fetchJobicy(jobTitle) {
    try {
        const res = await fetch(
            `https://jobicy.com/api/v2/remote-jobs?tag=${encodeURIComponent(jobTitle)}&count=5`
        );
        if(!res.ok) return [];
        const data = await res.json();
        return (data.jobs || []).map(job => ({
            title: job.jobTitle,
            company: job.companyName,
            location: job.jobGeo,
            isRemote: true,
            url: job.url,
            salary: job.annualSalaryMin ? {
                min: job.annualSalaryMin,
                max: job.annualSalaryMax,
                currency: job.salaryCurrency
            } : null,
            postedAt: job.pubDate,
            source: 'jobicy'
        }));
    } catch (err) {
        console.error("Jobicy fetch failed", err);
        return [];
    }
}

export async function fetchAdzuna(jobTitle, location = 'us') {
    if (!process.env.ADZUNA_APP_ID || !process.env.ADZUNA_APP_KEY) return [];
    try {
        const res = await fetch(
            `https://api.adzuna.com/v1/api/jobs/${location}/search/1` +
            `?app_id=${process.env.ADZUNA_APP_ID}` +
            `&app_key=${process.env.ADZUNA_APP_KEY}` +
            `&what=${encodeURIComponent(jobTitle)}` +
            `&results_per_page=5`
        );
        if(!res.ok) return [];
        const data = await res.json();
        return (data.results || []).map(job => ({
            title: job.title,
            company: job.company?.display_name,
            location: job.location?.display_name,
            isRemote: false,
            url: job.redirect_url,
            salary: job.salary_min ? {
                min: job.salary_min,
                max: job.salary_max
            } : null,
            postedAt: job.created,
            source: 'adzuna'
        }));
    } catch (err) {
        console.error("Adzuna fetch failed", err);
        return [];
    }
}

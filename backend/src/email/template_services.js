import db from '../db.js';

function render(str, data) {
    return str.replace(/{{\s*([\w.]+)\s*}}/g, (_, key) => {
        const val = data?.[key];
        return val === undefined || val === null ? '' : String(val);
    });
}

export async function renderTemplateByName(name, data) {
    const tResult = await db.query(
        `
        SELECT subject, body
        FROM email_templates
        WHERE name = $1 AND active = TRUE
        `,
        [name]
    );
    if(tResult.rows.length === 0) throw new Error(`Template email "${name}" non trovato o non attivo`);

    const { subject, body } = tResult.rows[0];
    return {
        subject: render(subject, data),
        body: render(body, data)
    };
}
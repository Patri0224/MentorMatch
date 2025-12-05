$(document).ready(function () {
    const $html = $('html');
    const $toggleBtn = $('#theme-toggle');
    const $icon = $toggleBtn.find('i');

    function setTheme(mode) {
        $html.attr('data-bs-theme', mode);
        if (mode === 'dark') {
            $icon.removeClass('bi-moon-stars-fill').addClass('bi-sun-fill');
            localStorage.setItem('theme', 'dark');
        } else {
            $icon.removeClass('bi-sun-fill').addClass('bi-moon-stars-fill');
            localStorage.setItem('theme', 'light');
        }
    }

    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        setTheme(savedTheme);
    } else {
        //rileva da sistema operativo
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            setTheme('dark');
        }
    }

    $toggleBtn.on('click', function () {
        const currentTheme = $html.attr('data-bs-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        setTheme(newTheme);
    });
});
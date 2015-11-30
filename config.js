const { loadFront } = require('yaml-front-matter');

module.exports = {
  FILES_REGEXP: /^content\/events/,
  REPO: 'moscowjs/moscowjs.ru',
  createGitterActivity(files) {
    return files.map(({ content }) => {
      const { title, date, registrationLink } = loadFront(content);
      const { day, month, year } = date;
      return `# ${title}
      ${day} ${month} ${year}
      [регистрация](${registrationLink})`;
    });
  },
};

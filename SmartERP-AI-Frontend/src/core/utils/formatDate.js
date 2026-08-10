export const formatDate = (date, options = { dateStyle: 'medium' }) =>
  date ? new Intl.DateTimeFormat('en-IN', options).format(new Date(date)) : ''

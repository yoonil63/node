var connectionString = process.env.DATABASE_URL || 'postgres://admin:admin@localhost:5432/lopreter';

module.exports = connectionString;
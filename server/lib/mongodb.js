import mongoose from 'mongoose'

const companyConnections = {}

export async function connectMasterDB() {
  if (mongoose.connection.readyState === 1) return mongoose.connection

  const uri = process.env.MONGODB_URI || 'mongodb+srv://ashishbhargav110_db_user:5HGE6geW9KxyVkBv@cluster0.t6frafk.mongodb.net/nexora_master'
  await mongoose.connect(uri)
  console.log('Connected to master DB')
  return mongoose.connection
}

export async function connectCompanyDB(dbName) {
  if (companyConnections[dbName] && companyConnections[dbName].readyState === 1) {
    return companyConnections[dbName]
  }

  const baseUri = process.env.MONGODB_URI || 'mongodb+srv://ashishbhargav110_db_user:5HGE6geW9KxyVkBv@cluster0.t6frafk.mongodb.net/nexora_master'
  // Replace the DB name in the URI
  const uri = baseUri.replace(/\/[^/?]+(\?|$)/, `/${dbName}$1`)

  const conn = await mongoose.createConnection(uri).asPromise()
  companyConnections[dbName] = conn
  return conn
}

import { Client, Storage } from 'appwrite';

const client = new Client()
  .setEndpoint('https://cloud.appwrite.io/v1') // Appwrite endpoint
  .setProject('68fcc72200050aaea6ad'); // Your project ID

export const storage = new Storage(client);
export default client;

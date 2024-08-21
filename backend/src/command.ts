import { exec } from 'child_process';
import { promisify } from 'util';

async function createTransaction(){
  
}


const execPromise = promisify(exec);

// Usage with async/await
async function runCommand(command: string) {
  try {
    const { stdout, stderr } = await execPromise(command);
    if (stderr) {
      console.error(`Error: ${stderr}`);
    } else {
      console.log(`Output: ${stdout}`);
    }
  } catch (error) {
    console.error(`Exec error: ${error}`);
  }
}
const fs = require('fs');
require('dotenv').config();

const File = require('../models/File');

const FILES_DIR = process.env.FILES_DIR;

class FileService {
  createDir(file) {
    const filePath = `${FILES_DIR}\\${file.user}\\${file.path}`
    return new Promise((resolve, reject) => {
      try {
        if(!fs.existsSync(file)) {
          fs.mkdirSync(filePath);
          return resolve({ message: 'File was created' });
        } else {
          return resolve({ message: 'File already exists' });
        }
      } catch (e) {
        return reject({ message: 'File error '});
      }
    })
  }

  getPath(file) {
    return `${FILES_DIR}\\${file.user}\\${file.path}`;
  }

  deleteFile(file) {
    const path = this.getPath(file);
    file.type === 'dir'
      ? fs.rmdirSync(path)
      : fs.unlinkSync(path);
  }
}

module.exports = new FileService();
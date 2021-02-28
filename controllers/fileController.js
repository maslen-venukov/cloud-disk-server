const fs = require('fs');
require('dotenv').config();

const fileService = require('../services/fileService');
const User = require('../models/User');
const File = require('../models/File');

const FILES_DIR = process.env.FILES_DIR;

class FileController {
  async createDir(req, res) {
    try {
      const { name, type, parent } = req.body;
      const file = new File({ name, type, parent, user: req.user.id });
      const parentFile = await File.findOne({ _id: parent });

      if(!parentFile) {
        file.path = name;
        await fileService.createDir(file);
      } else {
        file.path = `${parentFile.path}\\${file.name}`;
        await fileService.createDir(file);
        parentFile.children = [...parentFile.children, file._id];
        await parentFile.save();
      }

      await file.save();
      return res.json(file);
    } catch (e) {
      console.log(e);
      return res.status(400).json(e);
    }
  }

  async getFiles(req, res) {
    try {
      const files = await File.find({ user: req.user.id, parent: req.query.parent });
      return res.json(files);
    } catch (e) {
      console.log(e);
      return res.status(500).json({ message: 'Can not get files' });
    }
  }

  async uploadFile(req, res) {
    try {
      const file = req.files.file;
      const parent = await File.findOne({ user: req.user.id, _id: req.body.parent });
      const user = await User.findOne({ _id: req.user.id });

      if(user.usedSpace + file.size > user.diskSpace) {
        return res.status(400).json({ message: 'There is no space on the disk'});
      }

      user.usedSpace = user.usedSpace + file.size;

      const path = parent
        ? `${FILES_DIR}\\${user.id}\\${parent.path}\\${file.name}`
        : `${FILES_DIR}\\${user.id}\\${file.name}`;

      if(fs.existsSync(path)) {
        return res.status(400).json({ message: 'File is already exists'});
      }

      file.mv(path);

      const type = file.name.split('.')[1];
      const filePath = parent
        ? `${parent.path}\\${file.name}`
        : file.name;
      const dbFile = new File({
        name: file.name,
        type,
        size: file.size,
        path: filePath,
        user: user._id,
        parent: parent?._id
      })

      await dbFile.save();
      await user.save();

      res.json(dbFile);
    } catch (e) {
      console.log(e);
      return res.status(500).json({ message: 'Upload error' });
    }
  }

  async downloadFile(req, res) {
    try {
      const file = await File.findOne({ _id: req.query.id, user: req.user.id });
      const path = `${FILES_DIR}\\${req.user.id}\\${file.path}`;

      if(fs.existsSync(path)) {
        return res.download(path, file.name)
      }

      return res.status(400).json({ message: 'Download error' });
    } catch (e) {
      console.log(e);
      return res.status(500).json({ message: 'Download error' });
    }
  }

  async deleteFile(req, res) {
    try {
      const file = await File.findOne({ _id: req.query.id, user: req.user.id });
      if(!file) {
        return res.status(400).json({ message: 'File not found' });
      }
      fileService.deleteFile(file);
      await file.remove();
      return res.json({ message: 'File was deleted' });
    } catch (e) {
      console.log(e);
      return res.status(400).json({ message: 'Directory is not empty' });
    }
  }
}

module.exports = new FileController();
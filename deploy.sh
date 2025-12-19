#!/bin/bash
cd ~/ticket-management-system
git pull origin main
npm install
pm2 restart all
pm2 logs --lines 20

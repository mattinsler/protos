#!/usr/bin/env node

import protocPlugin from 'protoc-plugin';

import { parse } from './parse';

protocPlugin(protos => [
  {
    name: 'protos.json',
    content: JSON.stringify(parse(protos))
  }
]).catch(err => console.error(err));

import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';

const DATA_DIR = path.join(process.cwd(), 'data');

function createDefaultTree() {
  return {
    id: randomUUID(),
    statement: '',
    apis: [],
    children: [],
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const filename = searchParams.get('filename') || 'default.json';
  const safeFilename = path.basename(filename);
  const filePath = path.join(DATA_DIR, safeFilename);

  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    const data = await fs.readFile(filePath, 'utf-8');
    return NextResponse.json(JSON.parse(data));
  } catch (error) {
    // If the file doesn't exist (first run, or user typed a new name), return a valid empty tree
    // so the UI doesn't get stuck in a "Loading..." state.
    return NextResponse.json(createDefaultTree());
  }
}

export async function POST(request: Request) {
  try {
    const { tree, filename } = await request.json();
    const targetFile = filename || 'default.json';
    const filePath = path.join(DATA_DIR, targetFile);

    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(tree, null, 2));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to save tree' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
    const { searchParams } = new URL(request.url);
    const filename = searchParams.get('filename');
    if (!filename) return NextResponse.json({ error: 'No filename' }, { status: 400 });

    try {
        await fs.unlink(path.join(DATA_DIR, filename));
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
    }
}


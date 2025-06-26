#!/usr/bin/env bun

import { parse } from 'node-html-parser';
import { readdir } from 'node:fs/promises';
import path from 'node:path';

interface ValidationIssue {
  file: string;
  line: number;
  issue: string;
  context?: string;
}

async function validateHtmlFile(filePath: string): Promise<ValidationIssue[]> {
  const issues: ValidationIssue[] = [];
  const content = await Bun.file(filePath).text();
  const lines = content.split('\n');
  
  try {
    const root = parse(content, {
      lowerCaseTagName: false,
      comment: true,
      voidTag: {
        tags: ['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr'],
        closingSlash: true
      }
    });

    // Check for common HTML structure issues
    
    // 1. Find <p> tags containing block elements
    const paragraphs = root.querySelectorAll('p');
    for (const p of paragraphs) {
      const blockElements = p.querySelectorAll('div, table, ul, ol, pre, h1, h2, h3, h4, h5, h6, aside, article, section, nav, header, footer');
      if (blockElements.length > 0) {
        const lineNum = findLineNumber(lines, p.innerHTML);
        issues.push({
          file: path.basename(filePath),
          line: lineNum,
          issue: `<p> tag contains block-level element(s): ${blockElements.map(el => el.tagName).join(', ')}`,
          context: p.outerHTML.substring(0, 200) + '...'
        });
      }
    }

    // 2. Check for nested tables
    const tables = root.querySelectorAll('table');
    for (const table of tables) {
      const nestedTables = table.querySelectorAll('table');
      if (nestedTables.length > 0) {
        const lineNum = findLineNumber(lines, table.outerHTML);
        issues.push({
          file: path.basename(filePath),
          line: lineNum,
          issue: 'Nested table detected',
          context: table.outerHTML.substring(0, 200) + '...'
        });
      }
    }

    // 3. Check for improperly closed tags
    const allElements = root.querySelectorAll('*');
    for (const elem of allElements) {
      // Check if element has mismatched closing tag
      if (elem.innerHTML && elem.innerHTML.includes(`</${elem.tagName}>`)) {
        // This could indicate a parsing issue
        const lineNum = findLineNumber(lines, elem.outerHTML);
        issues.push({
          file: path.basename(filePath),
          line: lineNum,
          issue: `Potential tag mismatch or unclosed tag near <${elem.tagName}>`,
          context: elem.outerHTML.substring(0, 200) + '...'
        });
      }
    }

    // 4. Look for SQL widget placeholders wrapped in paragraphs
    const sqlWidgets = root.querySelectorAll('.sql-widget-placeholder');
    for (const widget of sqlWidgets) {
      if (widget.parentNode && widget.parentNode.tagName === 'P') {
        const lineNum = findLineNumber(lines, widget.outerHTML);
        issues.push({
          file: path.basename(filePath),
          line: lineNum,
          issue: 'SQL widget wrapped in paragraph tag',
          context: widget.parentNode.outerHTML.substring(0, 200) + '...'
        });
      }
    }

    // 5. Check for any text nodes that might be escaping the main content area
    const mainContent = root.querySelector('.main-content article');
    if (mainContent) {
      const allTextNodes = getTextNodes(mainContent);
      for (const textNode of allTextNodes) {
        if (textNode.textContent && textNode.textContent.trim().length > 100) {
          // Check if this text node is directly under a block element without proper wrapping
          const parent = textNode.parentNode;
          if (parent && ['DIV', 'ARTICLE', 'SECTION'].includes(parent.tagName)) {
            const lineNum = findLineNumber(lines, textNode.textContent);
            issues.push({
              file: path.basename(filePath),
              line: lineNum,
              issue: 'Long text node directly under block element without paragraph wrapper',
              context: textNode.textContent.substring(0, 100) + '...'
            });
          }
        }
      }
    }

  } catch (error: any) {
    issues.push({
      file: path.basename(filePath),
      line: 0,
      issue: `Parse error: ${error.message}`
    });
  }

  return issues;
}

function findLineNumber(lines: string[], searchText: string): number {
  const searchSnippet = searchText.substring(0, 50);
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(searchSnippet)) {
      return i + 1;
    }
  }
  return 0;
}

function getTextNodes(element: any): any[] {
  const textNodes: any[] = [];
  
  function traverse(node: any) {
    if (node.nodeType === 3) { // Text node
      textNodes.push(node);
    } else if (node.childNodes) {
      for (const child of node.childNodes) {
        traverse(child);
      }
    }
  }
  
  traverse(element);
  return textNodes;
}

async function validateAllHtml() {
  const distChapters = 'dist/chapters';
  const files = await readdir(distChapters);
  const htmlFiles = files.filter(f => f.endsWith('.html')).sort();
  
  console.log(`🔍 Validating ${htmlFiles.length} HTML files...\n`);
  
  let totalIssues = 0;
  
  for (const file of htmlFiles) {
    const filePath = path.join(distChapters, file);
    const issues = await validateHtmlFile(filePath);
    
    if (issues.length > 0) {
      console.log(`\n📄 ${file} (${issues.length} issues):`);
      for (const issue of issues) {
        console.log(`  Line ${issue.line}: ${issue.issue}`);
        if (issue.context) {
          console.log(`    Context: ${issue.context}`);
        }
      }
      totalIssues += issues.length;
    }
  }
  
  if (totalIssues === 0) {
    console.log('\n✅ No HTML validation issues found!');
  } else {
    console.log(`\n⚠️  Found ${totalIssues} total issues across all files.`);
  }
}

// Check specific file if provided, otherwise validate all
const specificFile = process.argv[2];
if (specificFile) {
  console.log(`🔍 Validating ${specificFile}...\n`);
  const issues = await validateHtmlFile(specificFile);
  
  if (issues.length === 0) {
    console.log('✅ No issues found!');
  } else {
    console.log(`Found ${issues.length} issues:`);
    for (const issue of issues) {
      console.log(`  Line ${issue.line}: ${issue.issue}`);
      if (issue.context) {
        console.log(`    Context: ${issue.context}`);
      }
    }
  }
} else {
  await validateAllHtml();
}
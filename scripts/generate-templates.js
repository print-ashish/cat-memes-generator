import fs from 'fs';
import path from 'path';

const templatesDir = path.join(process.cwd(), 'public', 'templates');
const outputFile = path.join(process.cwd(), 'public', 'templates.json');

const generateTemplates = () => {
  try {
    if (!fs.existsSync(templatesDir)) {
      console.error(`Directory not found: ${templatesDir}`);
      return;
    }

    const files = fs.readdirSync(templatesDir);
    const templates = files
      .filter(file => /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(file))
      .map((file, index) => {
        // Create a friendly name from the filename
        const name = file
          .replace(/\.[^/.]+$/, "")
          .split(/[_-]/)
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');

        return {
          id: index + 1,
          name: name,
          url: `/templates/${file}`,
          emotion: 'all' // Default emotion, can be refined based on filename later
        };
      });

    fs.writeFileSync(outputFile, JSON.stringify(templates, null, 2));
    console.log(`Successfully generated ${templates.length} templates in ${outputFile}`);
  } catch (error) {
    console.error('Error generating templates:', error);
  }
};

generateTemplates();

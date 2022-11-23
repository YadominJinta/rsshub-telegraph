import * as HTMLParse from 'node-html-parser';
import * as HtmlMinifier from "html-minifier";
import axios from "axios";

interface NodeElement {
  tag: string;
  attrs: { [index: string]: string };
  children: Node[];
}

interface ICreatePageResult {
  ok: boolean;
  result: Page;
  error?: string
}

const TEXT_NODE = 3;
// const ELEMENT_NODE = 1;
const avaiable_tags = [
  'a', 'aside', 'b', 'blockquote', 'br', 'code', 'em', 'figcaption', 'figure', 'h3', 'h4',
  'hr', 'i', 'iframe', 'img', 'li', 'ol', 'p', 'pre', 's', 'strong', 'u', 'ul', 'video'
];

type Node = string | NodeElement;

interface Page {
  // path: Path to the page.
  path: string;
  // url: Url to the page.
  url: string;
  // title: Title of the page.
  title: string;
  // description: Description of the page.
  description: string;
  // author_name: Optional. Name of the author, displayed below the title.
  author_name?: string;
  // Optional. Profile link, opened when users click on the author's name below the title.  Can be any link, not necessarily to a Telegram profile or channel.
  author_url?: string;
  // image_url: Optional. Image URL of the page.
  image_url: string;
  // content: Optional. Content of the page.
  content?: [];
  // views: Number of page views for the page.
  views: number;
  // can_edit: Optional. Only returned if access_token passed. True, if the target Telegraph account can edit the page.
  can_edit?: boolean;
}

export class Telegraph {
  private readonly access_token: string;
  private readonly author_name: string;
  private readonly author_url: string

  constructor(access_token: string, author_name: string, author_url: string) {
    this.access_token = access_token;
    this.author_name = author_name;
    this.author_url = author_url;
  }

  public domToNode(domNode: HTMLParse.HTMLElement): Node {
    if (domNode.nodeType === TEXT_NODE) {
      return domNode.textContent;
    }
    const ne: NodeElement = {
      tag: '',
      attrs: {},
      children: [],
    };
    if (domNode.rawTagName === null) {
      ne.tag = 'p';
    } else {
      ne.tag = domNode.tagName.toLowerCase();
    }
    switch (ne.tag) {
      case 'h1':
        ne.tag = 'h3';
        break;
      case 'h2':
        ne.tag = 'h4';
        break;
      case 'h5':
        ne.tag = 'h3';
        break;
      case 'h6':
        ne.tag = 'h4';
        break;
      case 'del':
        ne.tag = 's';
        break;
      case 'code':
        if (domNode.parentNode?.tagName === 'pre') {
          ne.tag = 'pre';
        }
        break;
    }
    if (domNode.rawTagName === 'div') {
      if (['figure', 'img'].indexOf((domNode.childNodes[0] as HTMLParse.HTMLElement).rawTagName) !== -1) {
        return this.domToNode(domNode.childNodes[0] as HTMLParse.HTMLElement);
      }
    }
    if (avaiable_tags.indexOf(ne.tag) === -1) {
      return '';
    }
    Object.entries(domNode.attrs).forEach(([k, v]) => {
      if (k === 'href' || k === 'src') {
        ne.attrs[k] = v;
      }
    });
    ne.children = domNode.childNodes.map(child => {
      return this.domToNode(child as HTMLParse.HTMLElement);
    }).filter(child => {
      if (child !== '') {
        return child;
      }
    })
    return ne;
  }

  public async createPage(title: string, content: string): Promise<Page> {
    const parsed = HTMLParse.parse(
      HtmlMinifier.minify(content, {collapseWhitespace: true})
    );
    try {
      const result = await axios('https://api.telegra.ph/createPage', {
        method: 'POST',
        data: {
          access_token: this.access_token,
          title: title,
          author_name: this.author_name,
          author_url: this.author_url,
          content: (this.domToNode(parsed) as NodeElement).children
        }
      });
      if (result.status != 200) {
        throw new Error(result.statusText);
      }
      const resp = result.data as ICreatePageResult;
      if (!resp.ok) {
        throw new Error(`error creating page: ${resp.error}`);
      }
      return resp.result;
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}

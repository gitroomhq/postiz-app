import { IsIn, IsOptional, IsString, ValidateIf, IsUrl } from 'class-validator';

// Maximum characters Facebook allows on a background ("text format") post.
export const FACEBOOK_PRESET_MAX_CHARS = 130;

export interface FacebookPreset {
  id: string;
  name: string;
}

// Curated catalog of Facebook text-post background presets.
//
// Facebook exposes no documented Graph API edge to enumerate a page's
// `text_format_preset_id` options, so the list has to be hardcoded. These IDs
// appear to be global (same across pages). Source: Publer's documented
// Facebook background list. Background posts are text-only (no media), Pages
// only, and capped at ~130 characters.
export const FACEBOOK_PRESETS: FacebookPreset[] = [
  { id: '106018623298955', name: 'Solid purple' },
  { id: '365653833956649', name: 'Pink tropical plants' },
  { id: '618093735238824', name: 'Brown illustration' },
  { id: '191761991491375', name: '3D hearts' },
  { id: '2193627793985415', name: '3D heart-eyes emojis' },
  { id: '200521337465306', name: '3D flame emojis' },
  { id: '1821844087883360', name: 'Walking yellow illustration' },
  { id: '177465482945164', name: 'Light purple 3D cube pattern' },
  { id: '160419724814650', name: 'Orange with pink illustration' },
  { id: '248623902401250', name: '3D smiling emoji' },
  { id: '240401816771706', name: '3D rose emojis' },
  { id: '1868855943417360', name: '3D crying-laughter emoji' },
  { id: '255989551804163', name: 'Eye pink illustration' },
  { id: '1792915444087912', name: 'Illustration' },
  { id: '1654916007940525', name: 'Light grey illustration' },
  { id: '1679248482160767', name: 'Light blue illustration' },
  { id: '518948401838663', name: 'Pink heart pattern on pink' },
  { id: '423339708139719', name: 'Illustration' },
  { id: '204187940028597', name: 'Solid red' },
  { id: '621731364695726', name: 'Solid red' },
  { id: '518596398537417', name: 'Red illustration' },
  { id: '134273813910336', name: 'Tree red illustration' },
  { id: '217321755510854', name: 'Pink and purple hearts on pink' },
  { id: '323371698179784', name: 'Sunset red illustration' },
  { id: '901751159967576', name: 'Gradient, dark orange-red' },
  { id: '552118025129095', name: 'Brown illustration' },
  { id: '263789377694911', name: 'Apple red illustration' },
  { id: '606643333067842', name: 'Tulip light-orange illustration' },
  { id: '458988134561491', name: 'Cat dark-orange illustration' },
  { id: '548109108916650', name: 'Unicorn red illustration' },
  { id: '175493843120364', name: 'Pink and yellow gradient' },
  { id: '338976169966519', name: 'Stairs beige illustration' },
  { id: '206513879997925', name: 'Spiral beige illustration' },
  { id: '168373304017982', name: 'Cube beige illustration' },
  { id: '1271157196337260', name: 'Solid red' },
  { id: '174496469882866', name: 'Lemon yellow illustration' },
  { id: '862667370603267', name: 'Egg light-yellow illustration' },
  { id: '127541261450947', name: 'Ball green illustration' },
  { id: '218067308976029', name: 'Light grey illustration' },
  { id: '688479024672716', name: 'Gradient, teal light-green' },
  { id: '238863426886624', name: 'Cat light-blue illustration' },
  { id: '301029513638534', name: 'Solid teal' },
  { id: '154977255088164', name: 'Solid teal' },
  { id: '1941912679424590', name: 'Gradient, grey dark-grey' },
  { id: '396343990807392', name: 'Flower teal illustration' },
  { id: '143093446467972', name: 'Blue clouds on dark blue' },
  { id: '161409924510923', name: 'Rocket ship makes heart in sky' },
  { id: '145893972683590', name: 'Solid dark purple' },
  { id: '217761075370932', name: 'Solid blue' },
  { id: '931584293685988', name: 'Wave blue illustration' },
  { id: '148862695775447', name: 'Pink and purple hearts on purple' },
  { id: '100114277230063', name: 'Deep sea blue illustration' },
  { id: '558836317844129', name: 'Spiral purple illustration' },
  { id: '172497526576609', name: 'Watermelon light-purple illustration' },
  { id: '433967226963128', name: 'Solid purple' },
  { id: '197865920864520', name: 'Donut light-purple illustration' },
  { id: '643122496026756', name: 'Pink illustration' },
  { id: '762009070855346', name: 'Balloon light-grey illustration' },
  { id: '228164237768720', name: 'Grey heart pattern on black' },
  { id: '146487026137131', name: 'Rain black illustration' },
  { id: '221828835275596', name: 'Glasses light-grey illustration' },
  { id: '1903718606535395', name: 'Solid red' },
  { id: '1881421442117417', name: 'Solid black' },
  { id: '249307305544279', name: 'Gradient, red-blue' },
  { id: '1777259169190672', name: 'Gradient, purple-magenta' },
  { id: '303063890126415', name: 'Yellow/orange/pink gradient' },
  { id: '122708641613922', name: 'Gradient, dark-grey-black' },
  { id: '319468561816672', name: 'Dark blue illustration' },
  { id: '121945541697934', name: 'Pink illustration' },
  { id: '288211338285858', name: 'Blue illustration' },
  { id: '446330032368780', name: 'Gradient, red' },
  { id: '219266485227663', name: 'Solid magenta' },
  { id: '1289741387813798', name: 'Solid dark red' },
  { id: '1365883126823705', name: 'Solid blue' },
];

export class FacebookDto {
  @IsOptional()
  @ValidateIf(p => p.url)
  @IsUrl()
  url?: string;

  @IsIn(['post', 'story'])
  @IsOptional()
  post_type?: 'post' | 'story';

  // Optional Facebook background preset for text-only posts. Kept permissive
  // (@IsString rather than @IsIn) so existing posts without the field still
  // validate and future preset drift on Facebook's side doesn't hard-fail.
  @IsOptional()
  @IsString()
  text_format_preset_id?: string;
}

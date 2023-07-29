import {ExecJSON} from 'inspecjs';
import {version as HeimdallToolsVersion} from '../package.json';
import {BaseConverter, ILookupPath, MappedTransform} from './base-converter';
import {CweNistMapping} from './mappings/CweNistMapping';
import {
  DEFAULT_STATIC_CODE_ANALYSIS_NIST_TAGS,
  getCCIsForNISTTags
} from './utils/global';

const PROFILE_NAME = 'GRYPE';
const CWE_NIST_MAPPING = new CweNistMapping();

function convertToControlMapping(): MappedTransform<
  ExecJSON.Control,
  ILookupPath
> {
  return {
    id: {path: 'vulnerability.id'},
    title: {path: 'artifact.name'},
    desc: {path: 'vulnerability.description'},
    impact: {path: 'relatedVulnerabilities[0].cvss.metrics.impactScore'}, //to do
    refs: [], //to do, available in postgres.json as relatedVunerabilites.urls and vulnerability.dataSource
    tags: {
      cci: getCCIsForNISTTags(nistTag()),
      nist: nistTag()
    }, // to do
    source_location: {
      ref: {path: 'artifact.locations[0].path'} //multiple locations can be provided by grype, but only one goes into hdf
    },
    results: [
      {
        status: ExecJSON.ControlResultStatus.Failed,
        code_desc: {path: 'vulnerability.description'}, //need to fix this to return data from matchDetails (probably just matched by 'matcher' and type of match given by 'type')
        start_time: {path: 'descriptor.timestamp'}
      }
    ]
  };
}
function nistTag(): string[] {
  return CWE_NIST_MAPPING.nistFilter(
    [],
    DEFAULT_STATIC_CODE_ANALYSIS_NIST_TAGS
  );
}
export class GrypeMapper extends BaseConverter {
  mappings: MappedTransform<
    ExecJSON.Execution & {passthrough: unknown},
    ILookupPath
  > = {
    passthrough: {path: '.'},
    platform: {
      //should it really be heimdall tools? shouldn't it be the platform in grype results?
      name: 'Heimdall Tools',
      release: HeimdallToolsVersion
    },
    version: {path: 'descriptor.version'},
    statistics: {},
    profiles: [
      {
        name: PROFILE_NAME,
        version: {path: 'descriptor.version'},
        title: PROFILE_NAME,
        supports: [],
        sha256: '',
        controls: [
          {
            path: 'matches',
            ...convertToControlMapping()
          }
        ],
        attributes: [],
        groups: []
      }
    ]
  };
  constructor(grypeJson: string) {
    super(JSON.parse(grypeJson));
  }
}

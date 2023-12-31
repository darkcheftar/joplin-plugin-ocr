import type { ResourceType } from 'domain/model/Resource';

export type Request =
  | MarkdownOcrRequest
  | GetInstallDirRequest
  | GetResourcesRequest
  | SetSettingOfRequest
  | QueryCurrentNoteId
  | GetWsPortRequest
  | GetSettingOfRequest;

export interface MarkdownOcrRequest {
  event: 'markdownOcrRequest';
  payload: {
    url: string;
    index: number;
    resourceType: ResourceType;
  };
}

export interface GetResourcesRequest {
  event: 'getResources';
}

export interface GetInstallDirRequest {
  event: 'getInstallDir';
}

export interface GetWsPortRequest {
  event: 'getWsPort';
}

export interface GetSettingOfRequest {
  event: 'getSettingOf';
  payload: string;
}

export interface SetSettingOfRequest {
  event: 'setSettingOf';
  payload: {
    key: string;
    value: unknown;
  };
}

export interface QueryCurrentNoteId {
  event: 'queryCurrentNoteId';
}

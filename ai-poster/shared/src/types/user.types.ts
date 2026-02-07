export interface UserDto {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  timezone: string;
  createdAt: string;
}

export interface OrganizationDto {
  id: string;
  name: string;
  createdAt: string;
}

export interface TeamMemberDto {
  id: string;
  userId: string;
  organizationId: string;
  role: 'ADMIN' | 'MEMBER';
  disabled: boolean;
  user: UserDto;
}

export interface AuthResponse {
  user: UserDto;
  organization: OrganizationDto;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface RegisterDto {
  email: string;
  password: string;
  name: string;
  organizationName: string;
}

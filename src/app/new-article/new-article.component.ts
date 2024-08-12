import { Component, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { HeaderComponent } from '../header/header.component';
import { AngularFireStorage } from '@angular/fire/compat/storage';
import { ActivatedRoute, Router } from '@angular/router';
import { Location, NgStyle } from '@angular/common';
import { Article } from '../shared/models/article.model';
import { ArticlesService } from '../shared/services/articles/articles.service';
import { StateManagementService } from '../shared/services/state-management/state-management.service';
import { finalize } from 'rxjs/operators';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-new-article',
  standalone: true,
  imports: [HeaderComponent, ReactiveFormsModule, NgStyle],
  templateUrl: './new-article.component.html',
  styleUrl: './new-article.component.scss',
})
export class NewArticleComponent {
  newArticleForm!: FormGroup;
  isSubmit = false;
  basePath: string = '/images';
  images: Array<{ url: string; fileName: string }> = [];
  imageFiles: File[] = [];
  maxId!: number;
  isEdit = false;
  id?: number;
  downloadURL!: Observable<string>;
  article!: Article;

  /**
   * Creates an instance of NewArticleComponent.
   * @param {FormBuilder} formBuilder
   * @param {Store} store
   * @param {Router} router
   * @param {ActivatedRoute} activatedRoute
   *
   * @memberOf NewArticleComponent
   */
  constructor(
    private formBuilder: FormBuilder,
    private articlesService: ArticlesService,
    private location: Location,
    private stateManagementService: StateManagementService,
    private router: Router,
    private storage: AngularFireStorage,
    private activatedRoute: ActivatedRoute
  ) {}

  /**
   * @description initializes the data, creates the form and populates data incase of Edit
   * @memberOf NewArticleComponent
   */
  ngOnInit() {
    this.initializeData();
    this.createNewForm();
    if (this.isEdit) {
      this.populateData();
    }
  }

  onSelectFile(event: any) {
    const name = Date.now();
    const file = event.target.files[0];
    const filePath = `${this.basePath}/${name}`;
    const fileRef = this.storage.ref(filePath);
    const task = this.storage.upload(`${this.basePath}/${name}`, file);
    task
      .snapshotChanges()
      .pipe(
        finalize(() => {
          fileRef.getDownloadURL().subscribe((url) => {
            if (url) {
              this.images.push({ fileName: name.toString(), url });
            }
          });
        })
      )
      .subscribe();
  }

  /**
   * @description used to delete the selected image
   * @param {number} index
   *
   * @memberOf NewArticleComponent
   */
  deleteImage(index: number) {
    const storageRef = this.storage.ref(this.basePath);
    storageRef.child(this.images[index].fileName).delete();
    this.images.splice(index, 1);
  }

  /**
   * @description this function is triggered to submit the form
   * @memberOf NewArticleComponent
   */
  submit() {
    this.isSubmit = true;
    if (this.newArticleForm.valid) {
      let articlesCount = this.stateManagementService.articlesCount();
      let signedInUser = JSON.parse(
        sessionStorage.getItem(
          'firebase:authUser:AIzaSyBuE8Z8rhoJubTRcIq_ZrJ4Qz11cbu2H48:[DEFAULT]'
        ) as string
      );
      let newArticle: Article = {
        title: this.newArticleForm.value.title,
        comments: this.isEdit ? this.article.comments : [],
        date: this.isEdit ? this.article.date : new Date(),
        author: signedInUser.displayName,
        authorEmail: signedInUser.email,
        content: this.newArticleForm.value.content,
        minutes: this.newArticleForm.value.readingTime,
        id: this.isEdit ? this.article.id : articlesCount,
        isFeatured: this.newArticleForm.value.isFeatured,
        images: this.images.map((image) => image.url),
      };

      this.articlesService.addNewArticle(newArticle).subscribe({
        next: () => {
          this.router.navigateByUrl('/home');
        },
        error: (error) => {
          console.log(error.message);
        },
      });
    }
  }

  /**
   * @description this function is used to create a new form
   * @private
   *
   * @memberOf NewArticleComponent
   */
  private createNewForm() {
    this.newArticleForm = this.formBuilder.group({
      title: ['', Validators.required],
      readingTime: ['', Validators.required],
      content: ['', Validators.required],
      isFeatured: [false],
    });
  }

  cancel() {
    this.location.back();
  }

  private initializeData() {
    this.isEdit = false;
    this.images = [];
    this.activatedRoute.queryParams.subscribe((params) => {
      if (params['isEdit']) {
        this.isEdit = true;
      }
    });
  }

  private populateData() {
    this.article = this.stateManagementService.selectedArticle();
    if (this.article) {
      this.newArticleForm.patchValue({
        title: this.article.title,
        readingTime: this.article.minutes,
        content: this.article.content,
        isFeatured: this.article.isFeatured,
      });
      this.images =
        this.article.images?.map((url) => ({ fileName: '', url })) ?? [];
    }
  }
}
